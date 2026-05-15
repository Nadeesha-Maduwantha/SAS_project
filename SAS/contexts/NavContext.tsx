'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface NavContextType {
  expanded: boolean;
  toggle:   () => void;
  expand:   () => void;
}

const NavContext = createContext<NavContextType>({
  expanded: true,
  toggle:   () => {},
  expand:   () => {},
});

export function NavProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <NavContext.Provider value={{
      expanded,
      toggle: () => setExpanded(e => !e),
      expand: () => setExpanded(true),
    }}>
      {children}
    </NavContext.Provider>
  );
}

export const useNav = () => useContext(NavContext);