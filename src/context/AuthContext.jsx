import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  login as loginRequest,
  me as meRequest,
  register as registerRequest,
  firebaseAuth as firebaseAuthRequest,
  devPhoneAuth as devPhoneAuthRequest,
  linkPhone as linkPhoneRequest,
} from '../api/services/authService';
import { retryGymLink } from '../api/services/attendanceService';
import { setAuthToken } from '../api/client';
import { deleteToken, getToken, saveToken } from '../storage/tokenStorage';
import { getReadableError } from '../utils/apiError';
import { fetchProfile } from '../api/services/profileService';
import { needsOnboarding as profileNeedsOnboarding } from '../utils/profileTargets';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [gymLinked, setGymLinked] = useState(true);
  const [needsGymWait, setNeedsGymWait] = useState(false);
  const [needsGymChoice, setNeedsGymChoice] = useState(false);
  const [gymMatches, setGymMatches] = useState([]);
  const [needsPhoneLink, setNeedsPhoneLink] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  /** New users (no body stats / goal yet) go through the setup flow first. */
  const checkOnboarding = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      const needs = profileNeedsOnboarding(profile);
      setNeedsOnboarding(needs);
      return needs;
    } catch {
      // Network trouble must not lock people out; Today still shows "Finish setting up".
      setNeedsOnboarding(false);
      return false;
    }
  }, []);

  const persistToken = useCallback(async (value) => {
    setToken(value);
    setAuthToken(value);

    if (value) {
      await saveToken(value);
    } else {
      await deleteToken();
    }
  }, []);

  const normalizeUser = useCallback((raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id || raw.userId || raw.user_id;
    if (!id) return { ...raw };
    return { ...raw, id, userId: id };
  }, []);

  const applySession = useCallback(
    async (response, { showGymWait = false, promptPhoneLink = false } = {}) => {
      const nextToken = response?.token || response?.accessToken;
      const userId = response?.userId || response?.user?.id || response?.user?.userId;

      if (!nextToken) {
        throw new Error('No token received from login');
      }

      // Decide on onboarding before the token flips the navigator to the app.
      setAuthToken(nextToken);
      await checkOnboarding();
      await persistToken(nextToken);

      if (response?.user) {
        setUser(normalizeUser(response.user));
      } else if (userId) {
        setUser({ id: userId, userId });
      }

      let hydrated = null;
      try {
        const meUser = await meRequest();
        hydrated = normalizeUser(meUser);
        if (hydrated?.id) {
          setUser(hydrated);
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[Auth] /me after login failed:', e?.message || e);
        }
      }

      const matches = Array.isArray(response?.gymMatches)
        ? response.gymMatches
        : Array.isArray(response?.matches)
          ? response.matches
          : [];
      const choice =
        Boolean(response?.needsGymChoice) ||
        (!response?.gymLinked && matches.length > 1);

      const isLinked =
        response && Object.prototype.hasOwnProperty.call(response, 'gymLinked')
          ? Boolean(response.gymLinked)
          : true;

      const hasPhone = Boolean(
        hydrated?.phone || response?.phone || response?.user?.phone
      );

      const askPhone =
        Boolean(promptPhoneLink) &&
        (Boolean(response?.needsPhoneLink) || !hasPhone);

      setGymMatches(matches);
      setNeedsGymChoice(choice);
      setGymLinked(isLinked && !choice);
      setNeedsPhoneLink(askPhone);
      setNeedsGymWait(showGymWait && !isLinked && !choice && !askPhone);

      return {
        token: nextToken,
        userId,
        gymLinked: isLinked && !choice,
        needsGymChoice: choice,
        needsPhoneLink: askPhone,
        gymMatches: matches,
        gym: response?.gym || null,
      };
    },
    [persistToken, normalizeUser, checkOnboarding],
  );

  const bootstrap = useCallback(async () => {
    try {
      const storedToken = await getToken();
      if (!storedToken) {
        setInitializing(false);
        return;
      }
      await persistToken(storedToken);
      await checkOnboarding();
      try {
        const meUser = await meRequest();
        const normalized = normalizeUser(meUser);
        if (normalized?.id) {
          setUser(normalized);
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[Auth] bootstrap /me failed:', e?.message || e);
        }
      }
      try {
        const link = await retryGymLink();
        const matches = Array.isArray(link?.matches) ? link.matches : [];
        const choice =
          Boolean(link?.needsGymChoice) || (!link?.linked && matches.length > 1);
        setGymMatches(matches);
        setNeedsGymChoice(choice);
        setGymLinked(Boolean(link?.linked) && !choice);
        setNeedsGymWait(false);
      } catch {
        // Keep default; Gym tab can still show wait state if APIs 404
      }
    } catch (error) {
      await persistToken(null);
      setUser(null);
      setGymLinked(true);
      setNeedsGymWait(false);
      setNeedsGymChoice(false);
      setNeedsPhoneLink(false);
      setGymMatches([]);
    } finally {
      setInitializing(false);
    }
  }, [persistToken, normalizeUser, checkOnboarding]);

  const updateUser = useCallback((userData) => {
    setUser(normalizeUser(userData));
  }, [normalizeUser]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (payload) => {
      const response = await loginRequest(payload);
      if (__DEV__) {
        console.log('[Auth] Login response:', JSON.stringify(response, null, 2));
      }
      return applySession(response, { showGymWait: true });
    },
    [applySession],
  );

  const loginWithFirebase = useCallback(
    async (idToken, { fromGoogle = false } = {}) => {
      try {
        const response = await firebaseAuthRequest(idToken);
        const session = await applySession(response, {
          showGymWait: true,
          promptPhoneLink: fromGoogle,
        });
        return { success: true, ...session };
      } catch (error) {
        console.error('[Auth] Firebase login error:', error);
        return { success: false, error: getReadableError(error) };
      }
    },
    [applySession],
  );

  /** Expo Go / tunnel: phone only, no OTP */
  const loginWithDevPhone = useCallback(
    async (phone) => {
      try {
        const response = await devPhoneAuthRequest(phone);
        const session = await applySession(response, { showGymWait: true });
        return { success: true, ...session };
      } catch (error) {
        console.error('[Auth] Dev phone login error:', error);
        return { success: false, error: getReadableError(error) };
      }
    },
    [applySession],
  );

  const linkPhoneForGym = useCallback(
    async (phone, { idToken, merge } = {}) => {
      try {
        const result = await linkPhoneRequest(phone, { idToken, merge });
        setNeedsPhoneLink(false);
        setUser((prev) => (prev ? { ...prev, phone: result?.phone || phone } : prev));

        const matches = Array.isArray(result?.gymMatches) ? result.gymMatches : [];
        const choice =
          Boolean(result?.needsGymChoice) || (!result?.gymLinked && matches.length > 1);
        setGymMatches(matches);
        setNeedsGymChoice(choice);
        setGymLinked(Boolean(result?.gymLinked) && !choice);
        setNeedsGymWait(!result?.gymLinked && !choice);

        try {
          const meUser = await meRequest();
          const normalized = normalizeUser(meUser);
          if (normalized?.id) setUser(normalized);
        } catch {
          /* non-fatal */
        }
        // A merged account may bring a finished profile with it.
        if (result?.merged) await checkOnboarding();

        return { success: true, ...result };
      } catch (error) {
        const data = error?.response?.data || {};
        return {
          success: false,
          error: getReadableError(error),
          code: data.code || null,
          details: data.details || null,
        };
      }
    },
    [normalizeUser, checkOnboarding],
  );

  const skipPhoneLink = useCallback(() => {
    setNeedsPhoneLink(false);
    if (!gymLinked && !needsGymChoice) {
      setNeedsGymWait(true);
    }
  }, [gymLinked, needsGymChoice]);

  const register = useCallback(
    async (payload) => {
      const response = await registerRequest(payload);
      return applySession(response, { showGymWait: true });
    },
    [applySession],
  );

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }
    const updatedUser = await meRequest();
    setUser(normalizeUser(updatedUser));
  }, [token, normalizeUser]);

  const refreshGymLink = useCallback(async () => {
    const result = await retryGymLink();
    const matches = Array.isArray(result?.matches) ? result.matches : [];
    const choice = Boolean(result?.needsGymChoice) || (!result?.linked && matches.length > 1);
    const linked = Boolean(result?.linked) && !choice;
    setGymMatches(matches);
    setNeedsGymChoice(choice);
    setGymLinked(linked);
    if (linked) {
      setNeedsGymWait(false);
    }
    return result;
  }, []);

  const completeGymChoice = useCallback((result) => {
    setNeedsGymChoice(false);
    setGymMatches([]);
    setGymLinked(Boolean(result?.linked));
    setNeedsGymWait(false);
  }, []);

  const dismissGymWait = useCallback(() => {
    setNeedsGymWait(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setNeedsOnboarding(false);
    setGymLinked(true);
    setNeedsGymWait(false);
    setNeedsGymChoice(false);
    setNeedsPhoneLink(false);
    setGymMatches([]);
    await persistToken(null);
  }, [persistToken]);

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      gymLinked,
      needsGymWait,
      needsGymChoice,
      needsPhoneLink,
      needsOnboarding,
      completeOnboarding,
      gymMatches,
      login,
      loginWithFirebase,
      loginWithDevPhone,
      linkPhoneForGym,
      skipPhoneLink,
      register,
      logout,
      refreshUser,
      refreshGymLink,
      completeGymChoice,
      dismissGymWait,
      setGymLinked,
      updateUser,
    }),
    [
      initializing,
      login,
      loginWithFirebase,
      loginWithDevPhone,
      linkPhoneForGym,
      skipPhoneLink,
      logout,
      refreshUser,
      refreshGymLink,
      completeGymChoice,
      dismissGymWait,
      register,
      token,
      user,
      updateUser,
      gymLinked,
      needsGymWait,
      needsGymChoice,
      needsPhoneLink,
      needsOnboarding,
      completeOnboarding,
      gymMatches,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
