'use client';

// =============================================================
//  Per-custom-type permission hooks (System Settings -> User Types).
//
//  Admin/Super/Operation/Sales always get every capability below — same as
//  before this system existed. A custom user type only gets a capability
//  when an admin has switched the matching toggle on for that type; both
//  hooks share one fetch of /api/user-types under the hood.
//
//  useCoverEligibility -> can_request_cover  (backend-enforced too, in
//    services/cover_access.py's create_request())
//  useEmailEligibility -> can_email_clients  (gates the manual per-alert /
//    per-milestone "Email" compose button — separate from receive_alerts,
//    which is the not-yet-built automated digest)
// =============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';

function normRole(role: string) {
  return (role || '').trim().toLowerCase().replace(/[\s_]/g, '');
}

const BUILT_IN = new Set(['admin', 'super', 'superuser', 'operation', 'operationuser', 'sales', 'salesuser']);

type TypeRow = {
  key: string;
  can_request_cover?: boolean;
  can_email_clients?: boolean;
};

function useOwnUserType(): { type: TypeRow | null; isBuiltIn: boolean; failed: boolean; loading: boolean } {
  const { role } = useAuth();
  const [type, setType] = useState<TypeRow | null>(null);
  const [isBuiltIn, setIsBuiltIn] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = normRole(role);
    if (!r || BUILT_IN.has(r)) {
      setIsBuiltIn(true);
      setType(null);
      setFailed(false);
      setLoading(false);
      return;
    }
    setIsBuiltIn(false);
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    fetch(`${API}/api/user-types`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(res => res.json())
      .then(j => {
        const types: TypeRow[] = j.data || [];
        setType(types.find(t => normRole(t.key) === r) || null);
        setFailed(false);
      })
      .catch(() => { setType(null); setFailed(true); }) // fail closed on both hooks below
      .finally(() => setLoading(false));
  }, [role]);

  return { type, isBuiltIn, failed, loading };
}

export function useCoverEligibility(): { eligible: boolean; loading: boolean } {
  const { type, isBuiltIn, failed, loading } = useOwnUserType();
  return { eligible: isBuiltIn ? true : !failed && !!type?.can_request_cover, loading };
}

export function useEmailEligibility(): { eligible: boolean; loading: boolean } {
  const { type, isBuiltIn, failed, loading } = useOwnUserType();
  // can_email_clients defaults true at the DB level, so a custom type that
  // predates this toggle still gets the button by default — but a failed
  // lookup (rather than "field genuinely missing") fails closed, same as
  // useCoverEligibility, instead of silently granting it.
  return { eligible: isBuiltIn ? true : !failed && type?.can_email_clients !== false, loading };
}
