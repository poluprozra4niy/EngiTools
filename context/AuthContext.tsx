import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Extend our User interface to match app needs but mapped from Supabase
export interface User {
  id: string;
  username: string; // Stored in user_metadata
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

  // Helper to map Supabase user to our App User
  const mapUser = (sbUser: SupabaseUser): User => {
    return {
      id: sbUser.id,
      email: sbUser.email || '',
      username: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Engineer',
      avatar: sbUser.user_metadata?.avatar_url || '',
      role: 'Engineer' // Default role
    };
  };

  useEffect(() => {
    // 0. Fallback immediately if config is obviously missing
    if (!isSupabaseConfigured) {
      loadOfflineUser();
      setLoading(false);
      return;
    }

    // 1. Check active session with error catching
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error("Supabase Init Error:", error);
            // If connection fails, fallback to offline
            throw error;
        }

        setSession(data.session);
        if (data.session?.user) {
            setUser(mapUser(data.session.user));
        }
      } catch (err: any) {
        console.error("Critical Auth Error (Switching to Offline):", err);
        setConnectionError("Ошибка подключения к облаку. Включен локальный режим.");
        loadOfflineUser();
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(mapUser(session.user));
      } else {
        // Don't clear user immediately if we have a connection error (keep offline user)
        if (!connectionError) setUser(null); 
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadOfflineUser = () => {
      const localUser = localStorage.getItem('demo_user');
      if (localUser) {
        try {
            setUser(JSON.parse(localUser));
        } catch(e) { 
            console.error("Bad local user data", e); 
        }
      }
  };

  const login = async (email: string, pass: string) => {
    // If config missing OR we previously failed to connect, use mock
    if (!isSupabaseConfigured || connectionError) {
      // Mock Login
      if (email && pass) {
        const demoUser: User = {
          id: 'demo_user_123',
          email: email,
          username: email.split('@')[0],
          role: 'Engineer'
        };
        setUser(demoUser);
        localStorage.setItem('demo_user', JSON.stringify(demoUser));
        return;
      }
      throw new Error("Offline Mode: Invalid credentials");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
  };

  const register = async (username: string, email: string, pass: string) => {
    if (!isSupabaseConfigured || connectionError) {
      // Mock Register
      const demoUser: User = {
        id: `demo_${Date.now()}`,
        email: email,
        username: username,
        role: 'Engineer'
      };
      setUser(demoUser);
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: username,
        },
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    if (!isSupabaseConfigured || connectionError) {
        setUser(null);
        localStorage.removeItem('demo_user');
        return;
    }
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    // Optimistic update
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    if (!isSupabaseConfigured || connectionError) {
        localStorage.setItem('demo_user', JSON.stringify(updatedUser));
        return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: updates.username || user.username,
        avatar_url: updates.avatar || user.avatar
      }
    });

    if (error) throw error;
  };

  const changePassword = async (oldPass: string, newPass: string) => {
    if (!isSupabaseConfigured || connectionError) return;
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout, updateProfile, changePassword, connectionError }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};