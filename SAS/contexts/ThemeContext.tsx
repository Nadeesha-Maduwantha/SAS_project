'use client';

// =============================================================
//  File: contexts/ThemeContext.tsx
//  Place at: contexts/ThemeContext.tsx  (in your project root)
//
//  Provides isDark + toggleTheme to the whole app.
//  Persists preference to localStorage.
//  Applies/removes the "dark" class on <html> so that
//  Tailwind dark: variants and our CSS vars both work.
// =============================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeContextValue {
  isDark:      boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark:      false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start with false — will be overridden by localStorage on mount
  // Using false as default prevents hydration mismatch (server always renders light)
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // On mount: read saved preference.
  // Light is the default — the OS colour scheme is deliberately not followed,
  // so the app looks identical regardless of the machine it is demoed on.
  // Dark only applies when the user picks it from the profile menu.
  useEffect(() => {
    const shouldBeDark = localStorage.getItem('sas-theme') === 'dark';

    setIsDark(shouldBeDark);
    setMounted(true);

    // Apply immediately to avoid flash
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('sas-theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Prevent flash of wrong theme — render children only after mount
  // Use opacity trick so layout doesn't shift
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.15s' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}