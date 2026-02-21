import { useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ThemeContext,
  type Theme,
  type ActualTheme,
  type ThemeContextValue,
} from "./themeContextDef";

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
  const [theme, setThemeState] = useState<Theme>("system");
  const [actualTheme, setActualTheme] = useState<ActualTheme>(() =>
    resolveTheme("system")
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          const loadedTheme = settings.theme || "system";
          setThemeState(loadedTheme);
          setActualTheme(resolveTheme(loadedTheme));
        }
      } catch (error) {
        console.error("Failed to load theme from backend:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

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

  const setTheme = async (newTheme: Theme) => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });

      if (response.ok) {
        setThemeState(newTheme);
        setActualTheme(resolveTheme(newTheme));
      } else {
        console.error("Failed to save theme to backend");
      }
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  const value: ThemeContextValue = {
    theme,
    actualTheme,
    setTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
