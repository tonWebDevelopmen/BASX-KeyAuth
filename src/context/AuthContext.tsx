import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

export interface Owner {
  id: string;
  email: string;
  username: string;
  sellerKey: string;
  createdAt: string;
}

interface AuthContextType {
  owner: Owner | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  regenerateSellerKey: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('keyauth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('keyauth_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get<Owner>('/api/owner/me');
        if (res.data && res.data.id) {
          setOwner(res.data);
        } else {
          localStorage.removeItem('keyauth_token');
          setToken(null);
          setOwner(null);
        }
      } catch {
        localStorage.removeItem('keyauth_token');
        setToken(null);
        setOwner(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (userOrEmail: string, pass: string) => {
    const res = await api.post('/api/owner/login', { username: userOrEmail, email: userOrEmail, password: pass });
    if (res.error) {
      return { success: false, error: res.error };
    }
    localStorage.setItem('keyauth_token', res.data.token);
    setToken(res.data.token);
    setOwner(res.data.owner);
    return { success: true };
  };

  const register = async (email: string, username: string, pass: string) => {
    const res = await api.post('/api/owner/register', { email, username, password: pass });
    if (res.error) {
      return { success: false, error: res.error };
    }
    localStorage.setItem('keyauth_token', res.data.token);
    setToken(res.data.token);
    setOwner(res.data.owner);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('keyauth_token');
    setToken(null);
    setOwner(null);
  };

  const regenerateSellerKey = async (): Promise<string | null> => {
    const res = await api.post('/api/owner/regenerate-seller-key');
    if (res.data?.sellerKey && owner) {
      setOwner({ ...owner, sellerKey: res.data.sellerKey });
      return res.data.sellerKey;
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ owner, token, loading, login, register, logout, regenerateSellerKey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
