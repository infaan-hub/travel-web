import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { authAPI } from '../api/client';

interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  date_joined: string;
  profile_image_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<any>;
  adminRegister: (username: string, email: string, password: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/user/');
          setUser(res.data);
          await AsyncStorage.setItem('is_staff', String(res.data.is_staff || false));
        } catch {
          await logout();
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authAPI.login({ username, password });
    await AsyncStorage.setItem('access_token', res.data.access);
    await AsyncStorage.setItem('refresh_token', res.data.refresh);
    const userRes = await api.get('/user/');
    setUser(userRes.data);
    await AsyncStorage.setItem('is_staff', String(userRes.data.is_staff || false));
    return userRes.data;
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await authAPI.register({ username, email, password });
    return res.data;
  };

  const adminRegister = async (username: string, email: string, password: string) => {
    const res = await authAPI.adminRegister({ username, email, password });
    return res.data;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'is_staff']);
    setUser(null);
  };

  const isAdmin = user?.is_staff || false;

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, adminRegister, logout,
      isAuthenticated: !!user,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext) as AuthContextType;
