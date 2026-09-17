'use client';

// =============================================================
//  PendingUserRegistryCard — admin dashboard banner
//
//  Quiet by default (renders nothing) — appears only when the User Type
//  Rules scan has found emails in shipment data with no matching account
//  yet (services/user_type_rules.py scan_for_unmatched_people). Click
//  through to /admin/user_registry to review and register them.
// =============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { T } from '@/styles/tokens';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

export default function PendingUserRegistryCard() {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    fetch(`${API}/api/user-type-rules/suggestions?status=pending`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => r.json())
      .then(j => setCount((j.data || []).length))
      .catch(() => { /* quiet widget — a failed fetch just means it stays hidden */ });
  }, []);

  if (count === 0) return null;

  return (
    <div
      onClick={() => router.push('/admin/user_registry')}
      role="button"
      tabIndex={0}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
        background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: '12px',
        cursor: 'pointer', marginBottom: '16px', fontFamily: T.font,
      }}
    >
      <div style={{ background: '#fff', color: T.blue, padding: '8px', borderRadius: '8px', display: 'flex', flexShrink: 0 }}>
        <UserPlus size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, color: T.gray900 }}>
          {count} new email{count !== 1 ? 's' : ''} need{count === 1 ? 's' : ''} a user account
        </div>
        <div style={{ fontSize: '12px', color: T.blue, marginTop: '2px' }}>
          Found in shipment data with no matching profile — review in User Registry
        </div>
      </div>
    </div>
  );
}
