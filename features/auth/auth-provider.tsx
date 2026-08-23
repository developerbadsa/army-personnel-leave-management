"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

interface Personnel {
  id: string;
  serviceId: string;
  fullName: string;
  rank: string;
  unitId: string;
  sectionId?: string | null;
  unit?: { id: string; name: string; code: string };
  section?: { id: string; name: string; code: string } | null;
}

interface ModeratorAssignment {
  id: string;
  unitId?: string | null;
  sectionId?: string | null;
  unit?: { id: string; name: string; code: string } | null;
  section?: { id: string; name: string; code: string } | null;
}

interface User {
  id: string;
  email: string;
  role: "ADMIN" | "MODERATOR" | "USER";
  approvalAuthority: "NONE" | "COMMANDER" | "QUARTER_MASTER";
  status: string;
  lastLoginAt?: string | null;
  personnel?: Personnel;
  moderatorScope?: { unitIds: string[]; sectionIds: string[] };
  assignedModerators?: ModeratorAssignment[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetchApi<User>("/api/auth/me");
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await fetchApi<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.data) {
      setUser(res.data);
      router.push("/dashboard");
    } else {
      throw new Error(res.error || "Login failed");
    }
  };

  const logout = async () => {
    try {
      await fetchApi("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
