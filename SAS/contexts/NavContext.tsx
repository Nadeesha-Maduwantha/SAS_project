'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────
interface NavContextType {
  expanded: boolean;
  toggle:   () => void;
  expand:   () => void;
  collapse: () => void;
}

// ── Context ────────────────────────────────────────────────────────────────────
const NavContext = createContext<NavContextType>({
  expanded: false,
  toggle:   () => {},
  expand:   () => {},
  collapse: () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────────
export function NavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Always start collapsed
  const [expanded, setExpanded] = useState(false);

  // Collapse whenever the route changes (nav link clicked → new page)
  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  const toggle   = () => setExpanded(p => !p);
  const expand   = () => setExpanded(true);
  const collapse = () => setExpanded(false);

  return (
    <NavContext.Provider value={{ expanded, toggle, expand, collapse }}>
      {children}
    </NavContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useNav() {
  return useContext(NavContext);
}