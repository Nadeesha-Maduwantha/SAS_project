// useAuth Hook 
// TEMPORARY MOCK — internals will be replaced when the auth teammate connects
// the real session (JWT / Supabase auth). The hook interface (what it returns)
// stays exactly the same, so no page files need to change at that point.
//
// To test different departments while auth is pending, change `department` below:
//   'SEA' → Sea Freight super user
//   'AIR' → Air Freight super user


export interface AuthUser {
  staffCode: string
  name: string
  email: string
  department: string
  role: 'admin' | 'super_user' | 'operation_user' | 'sales_user'
}

const FALLBACK: AuthUser = {
  staffCode: 'STAFF001',
  name: 'Test User',
  email: 'test@dartglobal.com',
  department: 'SEA',
  role: 'super_user',
}

export function useAuth(): AuthUser {
  if (typeof window === 'undefined') {
    return FALLBACK
  }

  const email = localStorage.getItem('user_email')
  const role = localStorage.getItem('user_role')
  const department = localStorage.getItem('user_department')

  if (!email || !role) {
    return FALLBACK
  }

  return {
    staffCode: FALLBACK.staffCode,
    name: FALLBACK.name,
    email,
    department: department || FALLBACK.department,
    role: role as AuthUser['role'],
  }
}
