import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, me as meRequest, register as registerRequest } from '../api/services/authService';
import { setAuthToken } from '../api/client';
import { deleteToken, getToken, saveToken } from '../storage/tokenStorage';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const persistToken = useCallback(async (value) => {
    setToken(value);
    setAuthToken(value);

    if (value) {
      await saveToken(value);
    } else {
      await deleteToken();
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const storedToken = await getToken();
      if (!storedToken) {
        setInitializing(false);
        return;
      }
      await persistToken(storedToken);
      // Don't call meRequest() here - bootstrap will load user data
      // This prevents duplicate API calls
    } catch (error) {
      await persistToken(null);
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, [persistToken]);
  
  // Expose setUser so BootstrapContext can update it
  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (payload) => {
      const response = await loginRequest(payload);
      
      // Backend returns: { token, userId } (after extractData)
      // Response structure from backend: { message: "...", data: { token, userId } }
      // extractData should extract response.data.data = { token, userId }
      console.log('[Auth] Login response:', JSON.stringify(response, null, 2));
      
      const nextToken = response?.token || response?.accessToken;
      const userId = response?.userId || response?.user?.id;
      
      if (!nextToken) {
        console.error('[Auth] ❌ No token in login response');
        console.error('[Auth] Full response:', JSON.stringify(response, null, 2));
        console.error('[Auth] Response keys:', Object.keys(response || {}));
        throw new Error('No token received from login');
      }
      
      console.log('[Auth] ✅ Token received, saving...');
      await persistToken(nextToken);
      
      // If user object is provided, set it (for backward compatibility)
      // Otherwise, bootstrap will load the full user data
      if (response?.user) {
        setUser(response.user);
      } else if (userId) {
        // Minimal user object with just ID - bootstrap will load full data
        console.log('[Auth] Setting minimal user object with ID:', userId);
        setUser({ id: userId });
      }
      
      // Bootstrap will be loaded automatically by BootstrapContext
      // This ensures we only make ONE API call after login
      console.log('[Auth] ✅ Login successful, bootstrap will load user data');
    },
    [persistToken],
  );

  const register = useCallback(
    async (payload) => {
      const response = await registerRequest(payload);
      // Response structure: { user, token } after extractData
      const nextToken = response?.token || response?.accessToken;
      const registeredUser = response?.user;
      
      if (!nextToken) {
        console.error('Registration response:', response);
        throw new Error('No token received from registration');
      }
      
      await persistToken(nextToken);
      setUser(registeredUser);
    },
    [persistToken],
  );

  const logout = useCallback(async () => {
    setUser(null);
    await persistToken(null);
    // Bootstrap data will be cleared by BootstrapContext
  }, [persistToken]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }
    const updatedUser = await meRequest();
    setUser(updatedUser);
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      login,
      register,
      logout,
      refreshUser,
      updateUser, // Expose updateUser for BootstrapContext
    }),
    [initializing, login, logout, refreshUser, register, token, user, updateUser],
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


