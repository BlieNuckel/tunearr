import { createContext } from "react";

export type Theme = "light" | "dark" | "system";
export type ActualTheme = "light" | "dark";

export interface ThemeContextValue {
  /** The stored theme preference ('light', 'dark', or 'system') */
  theme: Theme;
  /** The resolved theme ('light' or 'dark' only, resolves 'system' based on OS preference) */
  actualTheme: ActualTheme;
  /** Update the theme preference and persist to backend */
  setTheme: (theme: Theme) => Promise<void>;
  /** Loading state while fetching theme from backend */
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);
