import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setAccessToken, refreshSession, clearApiCache } from '../../services/api';
import { setCacheScope } from '../../lib/cache';
import * as authService from './authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setCacheScope(null);
    clearApiCache();
    sessionStorage.removeItem('refresh_token');
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Restore the session on page load, if a refresh token is stored.
  useEffect(() => {
    let active = true;

    async function restore() {
      if (!sessionStorage.getItem('refresh_token')) {
        if (active) setStatus('anonymous');
        return;
      }
      try {
        await refreshSession();
        const { data } = await authService.getMe();
        if (active) {
          setCacheScope(`${data.user.id}:${data.user.role}`);
          setUser(data.user);
          setStatus('authenticated');
        }
      } catch {
        if (active) clearSession();
      }
    }

    restore();
    return () => {
      active = false;
    };
  }, [clearSession]);

  useEffect(() => {
    window.addEventListener('auth:expired', clearSession);
    return () => window.removeEventListener('auth:expired', clearSession);
  }, [clearSession]);

  const loginWithTokens = useCallback((data) => {
    setAccessToken(data.access_token);
    setCacheScope(`${data.user.id}:${data.user.role}`);
    sessionStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials);
    return loginWithTokens(data);
  }, [loginWithTokens]);

  const logout = useCallback(async () => {
    try {
      await authService.logout(sessionStorage.getItem('refresh_token'));
    } catch {
      // Clear the local session even if the server call fails.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, status, login, loginWithTokens, logout }),
    [user, status, login, loginWithTokens, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}