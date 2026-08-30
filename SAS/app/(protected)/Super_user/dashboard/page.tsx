// app/(protected)/Super_user/dashboard/page.tsx
// A super user runs exactly one freight desk, so every card here is filtered to
// that desk. The desk comes from profiles.department, cached at login.
// Login refuses super users without an Air/Sea department, so by the time this
// page renders there is normally a mode — the fetch below only covers sessions
// that predate the department being cached.
'use client';

import { useEffect, useState } from 'react';
import SuperDashboardAnalytics from '@/components/SuperUser/SuperDashboardAnalytics';
import SuperBranchDelayCard from '@/components/SuperUser/SuperBranchDelayCard';
import PinnedTableStatCards from '@/components/shared/PinnedTableStatCard';
import { freightMode, storedFreightMode, type FreightMode } from '@/lib/departments';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:5000';

export default function SuperDashboardPage() {
  const [mode, setMode] = useState<FreightMode | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    const stored = storedFreightMode();
    if (stored) {
      setMode(stored);
      setResolving(false);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setResolving(false);
      return;
    }

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(result => {
        const resolved = freightMode(result?.user?.department);
        if (resolved) {
          localStorage.setItem('user_department', result.user.department);
          setMode(resolved);
        }
      })
      .catch(err => console.error('Could not resolve freight department:', err))
      .finally(() => setResolving(false));
  }, []);

  const deskName = mode === 'AIR' ? 'Air Freight' : mode === 'SEA' ? 'Sea Freight' : '';

  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--fs-lg)',
          fontWeight: 'var(--fw-bold)' as any,
          color: 'var(--c-text-strong)',
          marginBottom: 20,
        }}
      >
        Super User Dashboard{deskName && ` — ${deskName}`}
      </h1>

      {resolving ? (
        <div style={{ color: 'var(--c-text-muted)', padding: '24px 0' }}>Loading…</div>
      ) : !mode ? (
        <div style={{ color: 'var(--c-danger)', padding: '24px 0' }}>
          No Air or Sea department is set on your account. Ask an administrator to set it.
        </div>
      ) : (
        <>
          {/* Freight breakdown + shipment summary — this desk only */}
          <SuperDashboardAnalytics mode={mode} />

          {/* Pinned custom table stat cards */}
          <PinnedTableStatCards />

          {/* Where the delays sit, by branch — this desk only */}
          <SuperBranchDelayCard mode={mode} />
        </>
      )}
    </div>
  );
}
