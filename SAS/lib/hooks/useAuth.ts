// ─── useAuth Hook ─────────────────────────────────────────────────────────────
// TEMPORARY MOCK — internals will be replaced when the auth teammate connects
// the real session (JWT / Supabase auth). The hook interface (what it returns)
// stays exactly the same, so no page files need to change at that point.
//
// To test different departments while auth is pending, change `department` below:
//   'SEA' → Sea Freight super user
//   'AIR' → Air Freight super user
//   'ROAD' → Road Freight super user
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  staffCode: string
  name: string
  email: string
  department: string
  role: 'admin' | 'super_user' | 'operation_user' | 'sales_user'
}

export function useAuth(): AuthUser {
  // TODO: replace this return with real session data when auth is ready
  // e.g. const session = useSession() or read from Supabase auth context
  return {
    staffCode: 'STAFF001',
    name:      'Test User',
    email:     'test@dartglobal.com',
    department: 'AIR',   // ← change to 'AIR' or 'ROAD' to test other departments
    role:      'super_user',
  }
}