import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/auth';
import { setAccessToken, setOnUnauthorized } from '../api/client';
import { refresh as apiRefresh } from '../api/auth';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnUnauthorized(() => handleUnauthorized);
    // try refresh on mount
    (async () => {
      try {
        const refreshed = await apiRefresh();
        if (refreshed?.accessToken) {
          setToken(refreshed.accessToken);
          setAccessToken(refreshed.accessToken);
          const me = await fetchMe();
          setUser(me);
        }
      } catch (_err) {
        // stay unauth
      } finally {
        setLoading(false);
      }
    })();
    // cleanup
    return () => setOnUnauthorized(null);
  }, []);

  const handleUnauthorized = () => {
    setToken(null);
    setAccessToken(null);
    setUser(null);
  };

  const login = async (data: { email: string; password: string }) => {
    const res = await apiLogin(data);
    setToken(res.accessToken);
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (data: { username: string; email: string; password: string }) => {
    const res = await apiRegister(data);
    setToken(res.accessToken);
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async () => {
    await apiLogout();
    handleUnauthorized();
  };

  const refreshUser = async () => {
    try {
      const refreshed = await apiRefresh();
      if (refreshed?.accessToken) {
        setToken(refreshed.accessToken);
        setAccessToken(refreshed.accessToken);
        const me = await fetchMe();
        setUser(me);
      } else {
        handleUnauthorized();
      }
    } catch (_err) {
      handleUnauthorized();
      throw _err;
    }
  };

  const value = useMemo(
    () => ({ user, accessToken, loading, login, register, logout, refreshUser }),
    [user, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
