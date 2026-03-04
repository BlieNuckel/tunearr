import { createContext } from "react";

export type AuthUser = {
  id: number;
  username: string;
  userType: "local" | "plex";
  role: "admin" | "user";
  theme: "light" | "dark" | "system";
  thumb: string | null;
};

export type AuthStatus =
  | "loading"
  | "needs-setup"
  | "unauthenticated"
  | "authenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  plexLogin: () => Promise<void>;
  logout: () => Promise<void>;
  setup: (username: string, password: string) => Promise<void>;
  plexSetup: () => Promise<void>;
  updatePreferences: (prefs: { theme?: AuthUser["theme"] }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
