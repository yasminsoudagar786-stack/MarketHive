import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null, user: null, hydrated: false,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "mh-auth", skipHydration: true,
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => () => useAuth.setState({ hydrated: true }),
    },
  ),
);

export const homeFor = (role?: string): "/" | "/vendor" | "/admin" => (role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/");
