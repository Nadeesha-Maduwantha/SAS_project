'use client';

// =============================================================
//  File: contexts/ThemeContext.tsx
//  Place at: contexts/ThemeContext.tsx  (in your project root)
//
//  Dark mode has been removed from the UI (no toggle anywhere). This
//  provider is kept only so useTheme()/useDarkMode() call sites elsewhere
//  don't need to change — it always reports light and never applies the
//  "dark" class, including clearing any "dark" preference a user may have
//  saved before the toggle was removed.
// =============================================================

import { createContext, useContext, useEffect, ReactNode } from 'react';

interface ThemeContextValue {
  isDark:      boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark:      false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    localStorage.removeItem('sas-theme');
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}