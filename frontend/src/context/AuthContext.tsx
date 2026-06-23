import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { getAuthToken, setAuthToken } from '@/lib/apiClient';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => setAuthToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
  }

  async function signup(email: string, password: string, name: string) {
    const res = await authApi.signup({ email, password, name });
    setAuthToken(res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const res = await authApi.me();
    setUser(res.data);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
