import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: response, isLoading } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const user = response?.user;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === "super_admin",
    isAdmin: user?.role === "admin" || user?.role === "super_admin",
  };
}
