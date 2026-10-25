import { Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/stores/auth";
import type { Role } from "@/types";
import { Forbidden } from "./Forbidden";

export function ProtectedRoute({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, hydrated } = useAuth();
  const loc = useLocation();
  if (!hydrated) return <div className="min-h-[50vh]" aria-busy="true" />;
  if (!user) return <Navigate to="/login" search={{ redirect: loc.href }} replace />;
  if (roles && !roles.includes(user.role)) return <Forbidden />;
  return <>{children}</>;
}
