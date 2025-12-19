import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'Engineer' | 'Admin';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (username: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
  connectionError: string | null;
  debugInfo: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // Helper to map Supabase user to App User
  const mapUser = (sbUser: SupabaseUser): User => {
    return {
      id: sbUser.id,
      email: sbUser.email || '',
      username: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Engineer',
      avatar: sbUser.user_metadata?.avatar_url || '',
      role: (sbUser.user_metadata?.role as 'Engineer' | 'Admin') || 'Engineer' 
    };
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check Configuration
      if (!isSupabaseConfigured) {
        const errorMsg = "Supabase URL/Key not found in env variables.";
        setConnectionError(errorMsg);
        setDebugInfo({ config: 'MISSING', error: errorMsg });
        setLoading(false);
        return;
      }

      try {
        // 2. Test Connection & Session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            throw error;
        }

        setConnectionError(null);
        setSession(data.session);
        if (data.session?.user) {
            setUser(mapUser(data.session.user));
        }
        setDebugInfo({ config: 'OK', connection: 'ESTABLISHED', lastCheck: new Date().toISOString() });

      } catch (err: any) {
        console.error("Auth Init Failed:", err);
        const msg = err.message || "Failed to connect to Supabase";
        setConnectionError(msg);
        setDebugInfo({ config: 'OK', connection: 'FAILED', error: msg, details: err });
        // DO NOT set a fake user here. Fail gracefully.
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 3. Subscribe to Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(mapUser(session.user));
        setConnectionError(null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) throw new Error("База данных не подключена (Check .env)");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
  };

  const register = async (username: string, email: string, pass: string) => {
    if (!isSupabaseConfigured) throw new Error("База данных не подключена (Check .env)");

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: username,
          role: 'Engineer',
        },
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
    }
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user || !isSupabaseConfigured) return;

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: updates.username || user.username,
        avatar_url: updates.avatar || user.avatar,
      }
    });

    if (error) throw error;
    setUser({ ...user, ...updates });
  };

  const changePassword = async (oldPass: string, newPass: string) => {
    if (!isSupabaseConfigured) throw new Error("Нет соединения с БД");
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout, updateProfile, changePassword, connectionError, debugInfo }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};