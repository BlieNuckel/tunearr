import type { UserType } from "../db/entity/User";

export type AuthUser = {
  id: number;
  username: string;
  userType: UserType;
  permissions: number;
  enabled: boolean;
  theme: "light" | "dark" | "system";
  thumb: string | null;
  hasPlexToken: boolean;
  plexToken: string | null;
};
