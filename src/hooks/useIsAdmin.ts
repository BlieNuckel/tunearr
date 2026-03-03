import { useAuth } from "@/context/useAuth";

export function useIsAdmin(): boolean {
  return useAuth().user?.role === "admin";
}
