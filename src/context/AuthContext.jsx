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
        return;
      }
      await persistToken(storedToken);
      const currentUser = await meRequest();
      setUser(currentUser);
    } catch (error) {
      await persistToken(null);
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, [persistToken]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (payload) => {
      const response = await loginRequest(payload);
      // Response structure: { user, token } after extractData
      const nextToken = response?.token || response?.accessToken;
      const loggedInUser = response?.user;
      
      if (!nextToken) {
        console.error('Login response:', response);
        throw new Error('No token received from login');
      }
      
      await persistToken(nextToken);
      setUser(loggedInUser);
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
    }),
    [initializing, login, logout, refreshUser, register, token, user],
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


