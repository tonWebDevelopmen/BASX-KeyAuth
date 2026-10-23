import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

export interface Application {
  id: string;
  name: string;
  description?: string;
  secret: string;
  version: string;
  paused: boolean;
  ownerId: string;
  standing?: string;
  createdAt: string;
  _count?: {
    keys: number;
    users: number;
  };
  onlineUsers?: number;
}

interface AppContextType {
  apps: Application[];
  currentApp: Application | null;
  loadingApps: boolean;
  refreshApps: () => Promise<void>;
  selectApp: (app: Application) => void;
  createApp: (name: string, version?: string, description?: string) => Promise<{ success: boolean; app?: Application; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { owner } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [currentApp, setCurrentApp] = useState<Application | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);

  const refreshApps = useCallback(async () => {
    if (!owner) return;
    setLoadingApps(true);
    try {
      const res = await api.get<Application[]>('/api/apps');
      if (Array.isArray(res.data)) {
        setApps(res.data);
        if (res.data.length > 0) {
          // If currentApp exists in new data, keep it updated, else pick first
          setCurrentApp(prev => {
            if (prev) {
              const match = res.data.find(a => a.id === prev.id);
              if (match) return match;
            }
            return res.data[0];
          });
        } else {
          setCurrentApp(null);
        }
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoadingApps(false);
    }
  }, [owner]);

  useEffect(() => {
    if (owner) {
      refreshApps();
    } else {
      setApps([]);
      setCurrentApp(null);
    }
  }, [owner, refreshApps]);

  const selectApp = (app: Application) => {
    setCurrentApp(app);
  };

  const createApp = async (name: string, version?: string, description?: string) => {
    const res = await api.post<Application>('/api/apps', { name, version, description });
    if (res.error) {
      return { success: false, error: res.error };
    }
    await refreshApps();
    if (res.data) {
      setCurrentApp(res.data);
    }
    return { success: true, app: res.data };
  };

  return (
    <AppContext.Provider value={{ apps, currentApp, loadingApps, refreshApps, selectApp, createApp }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
