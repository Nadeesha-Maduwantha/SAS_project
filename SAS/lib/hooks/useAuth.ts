// useAuth Hook
// Reads the session saved by the login page (SAS/app/(auth)/page.tsx) into
// localStorage. Falls back to a placeholder when nothing is stored yet
// (e.g. server-side render, or dev without logging in).

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
