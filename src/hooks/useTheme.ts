import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "rv-theme";

const readStored = (): Theme => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

const apply = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
};

/**
 * Light/dark theme control. Dark is the default for first-time visitors; the
 * pre-paint inline script in index.html sets the initial class.
 */
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.classList.contains("dark") ? "dark" : readStored();
  });

  // Keep the DOM class in sync if another surface changed it.
  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    if (isDark !== (theme === "dark")) {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    apply(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      apply(next);
      return next;
    });
  }, []);

  return { theme, isDark: theme === "dark", setTheme, toggleTheme };
};

export default useTheme;
