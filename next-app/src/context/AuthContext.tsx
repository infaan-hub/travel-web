"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api, { authAPI } from "@/lib/api/client";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  date_joined: string;
  profile_image_url?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (username: string, email: string, password: string) => Promise<unknown>;
  adminRegister: (
    username: string,
    email: string,
    password: string,
    setupToken?: string,
  ) => Promise<unknown>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authAPI
      .getUser()
      .then((response) => {
        if (active) setUser(response.data);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    // The token response also sets HTTP-only cookies; no token is stored in JS.
    await api.post("/token/", { username, password });
    const response = await authAPI.getUser();
    setUser(response.data);
    return response.data as AuthUser;
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const response = await api.post("/register/", { username, email, password });
    return response.data;
  }, []);

  const adminRegister = useCallback(
    async (username: string, email: string, password: string, setupToken?: string) => {
      const response = await authAPI.adminRegister(
        { username, email, password },
        setupToken,
      );
      return response.data;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await authAPI.getUser();
    setUser(response.data);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        adminRegister,
        logout,
        refreshUser,
        isAuthenticated: Boolean(user),
        isAdmin: Boolean(user?.is_staff),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
