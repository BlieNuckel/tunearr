import type { UserRole, UserType } from "../db/entity/User";

export type AuthUser = {
  id: number;
  username: string;
  userType: UserType;
  role: UserRole;
  enabled: boolean;
  theme: "light" | "dark" | "system";
  thumb: string | null;
};
