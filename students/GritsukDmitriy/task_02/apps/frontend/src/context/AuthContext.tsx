import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode
} from 'react';
import type { User } from '../types';
import { configureApi, logout as apiLogout, refresh as apiRefresh, getMe } from '../api';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  loading: boolean; // alias for ProtectedRoute
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    tokenRef.current = null;
  }, []);

  // Configure API once on mount
  useEffect(() => {
    configureApi(
      () => tokenRef.current,
      (t) => {
        setAccessToken(t);
        tokenRef.current = t;
      },
      handleUnauthorized
    );
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRefresh();
        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
          const meRes = await getMe();
          setUser(meRes.data.user);
        }
      } catch {
        // not logged in
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback((token: string, u: User) => {
    setAccessToken(token);
    tokenRef.current = token;
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    setAccessToken(null);
    tokenRef.current = null;
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, loading: isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
