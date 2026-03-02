import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  ThemeContext,
  type Theme,
  type ActualTheme,
  type ThemeContextValue,
} from "./themeContextDef";
import { useAuth } from "./useAuth";

const getSystemTheme = (): ActualTheme => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
};

const resolveTheme = (theme: Theme): ActualTheme => {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user, status, updatePreferences } = useAuth();

  const userTheme: Theme = user?.theme ?? "system";

  const [theme, setThemeState] = useState<Theme>(userTheme);
  const [actualTheme, setActualTheme] = useState<ActualTheme>(() =>
    resolveTheme(userTheme)
  );

  useEffect(() => {
    setThemeState(userTheme);
    setActualTheme(resolveTheme(userTheme));
  }, [userTheme]);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setActualTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", actualTheme === "dark");
  }, [actualTheme]);

  const setTheme = useCallback(
    async (newTheme: Theme) => {
      setThemeState(newTheme);
      setActualTheme(resolveTheme(newTheme));

      if (status === "authenticated") {
        try {
          await updatePreferences({ theme: newTheme });
        } catch (error) {
          console.error("Failed to save theme:", error);
        }
      }
    },
    [status, updatePreferences]
  );

  const value: ThemeContextValue = {
    theme,
    actualTheme,
    setTheme,
    isLoading: false,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
