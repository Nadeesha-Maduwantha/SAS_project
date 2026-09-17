// useAuth Hook
// TEMPORARY MOCK — internals will be replaced when the auth teammate connects
// the real session (JWT / Supabase auth). The hook interface (what it returns)
// stays exactly the same, so no page files need to change at that point.
//
// To test different departments while auth is pending, change `department` below:
//   'SEA' → Sea Freight super user
//   'AIR' → Air Freight super user

import { useState, useEffect, useLayoutEffect } from 'react'

// Layout effects run (and, if they call setState, re-render/re-commit) before
// any passive `useEffect` in the tree fires. Using this for the localStorage
// swap-in means components that fetch role-scoped data in their own
// useEffect (CoverWorkSelector, CoverAccessPanel, ...) never observe the
// still-FALLBACK ('super_user') identity — without it, an operation user
// would briefly be fetched-for as a super user and see super-user peers.
// On the server there is no DOM to lay out, so fall back to useEffect there
// (a no-op — window/localStorage aren't available during SSR anyway).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect


export interface AuthUser {
  staffCode: string
  name: string
  email: string
  department: string
  // Widened (string & {}) so an admin-defined custom user type's role key
  // (System Settings -> User Types) is accepted too, while keeping
  // autocomplete for the 4 built-ins.
  role: 'admin' | 'super_user' | 'operation_user' | 'sales_user' | (string & {})
}

const FALLBACK: AuthUser = {
  staffCode: 'STAFF001',
  name: 'Test User',
  email: 'test@dartglobal.com',
  department: 'SEA',
  role: 'super_user',
}

export function useAuth(): AuthUser {
  // Start with the same value the server rendered (it has no localStorage),
  // then swap in the real session after mount. Reading localStorage directly
  // during render made the client's first (hydration) pass diverge from the
  // server-rendered HTML whenever a real session differed from FALLBACK,
  // which React reports as a hydration mismatch.
  const [user, setUser] = useState<AuthUser>(FALLBACK)

  useIsomorphicLayoutEffect(() => {
    const email = localStorage.getItem('user_email')
    const role = localStorage.getItem('user_role')
    const department = localStorage.getItem('user_department')

    if (!email || !role) return

    setUser({
      staffCode: FALLBACK.staffCode,
      name: FALLBACK.name,
      email,
      department: department || FALLBACK.department,
      role: role as AuthUser['role'],
    })
  }, [])

  return user
}
