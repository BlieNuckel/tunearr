import type { UserRole } from "../db/types";

export type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
  enabled: boolean;
  theme: "light" | "dark" | "system";
};
