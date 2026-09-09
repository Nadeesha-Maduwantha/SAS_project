'use client';

// =============================================================
//  SuperDashboardAnalytics.tsx
//
//  Two cards side by side on the Super User dashboard:
//    left  — freight breakdown for the user's own desk (air or sea),
//            with that desk's total shipment count shown top-right
//    right — headcount of the user's own department, with an
//            "Add New User" shortcut
//
//  A super user runs one desk only, so both cards are filtered by `mode`.
//  Reuses the admin card styling so both dashboards look identical.
// =============================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Anchor, Plane, Users, UserPlus } from 'lucide-react';
import DonutChart, { DonutLegendRow, type DonutSlice } from '@/components/shared/DonutChart';
import type { FreightMode } from '@/lib/departments';
import '@/styles/AdminStyles/AdminDashboardAnalytics.css';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:5000';

type DepartmentStats = {
  total?: number;
  on_time?: number;
  delayed?: number;
  delivered_today?: number;
  other?: number;
};

type DeptUsers = {
  total?: number;
  by_role?: Record<string, number>;
};

const ROLE_LABELS: Record<string, string> = {
  superuser: 'Super Users',
  salesuser: 'Sales Users',
  operationuser: 'Operation Users',
  admin: 'Admins',
  unknown: 'Other',
};

const ROLE_COLORS: Record<string, string> = {
  superuser: 'var(--c-chart-1)',
  salesuser: 'var(--c-chart-2)',
  operationuser: 'var(--c-chart-3)',
  admin: 'var(--c-chart-4)',
  unknown: 'var(--c-border)',
};

function CardShell({
  icon,
  iconTint,
  title,
  headerRight,
  children,
}: {
  icon: React.ReactNode;
  iconTint: string;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="freight-pie-card">
      <div className="freight-pie-card__head">
        <div
          className="freight-pie-card__icon"
          style={{ backgroundColor: `color-mix(in srgb, ${iconTint} 10%, transparent)` }}
        >
          {icon}
        </div>
        <h2 className="freight-pie-card__title">{title}</h2>
        {headerRight}
      </div>
      <div className="freight-pie-card__body">{children}</div>
    </div>
  );
}

// ── Freight breakdown for the user's own desk ─────────────────────────────────
function FreightCard({ mode }: { mode: FreightMode }) {
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/shipments/stats/department/${mode}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(result => setStats(result.data ?? null))
      .catch(err => console.error(`Failed to load ${mode} freight stats:`, err))
      .finally(() => setLoading(false));
  }, [mode]);

  // Same title/accent/icon mapping the admin dashboard uses, so the two match.
  const isAir = mode === 'AIR';
  const accent = isAir ? 'var(--c-chart-1)' : 'var(--c-chart-2)';

  const ongoing = stats?.on_time ?? 0;
  const overdue = stats?.delayed ?? 0;
  const completed = stats?.delivered_today ?? 0;
  // Neither on time, delayed, nor delivered — pickup status still blank/pending.
  const other = stats?.other ?? 0;
  // Every shipment of this transport mode; with "Other stage" the slices sum to it.
  const modeTotal = stats?.total ?? ongoing + overdue + completed + other;

  const slices: DonutSlice[] = [
    { label: 'Ongoing',     value: ongoing,   color: accent },
    { label: 'Overdue',     value: overdue,   color: 'var(--c-chart-5)' },
    { label: 'Completed',   value: completed, color: 'var(--c-chart-3)' },
    { label: 'Other stage', value: other,     color: 'var(--c-chart-6)' },
  ];

  return (
    <CardShell
      icon={isAir ? <Plane size={18} color={accent} /> : <Anchor size={18} color={accent} />}
      iconTint={accent}
      title={isAir ? 'Air Freight' : 'Sea Freight'}
      headerRight={
        !loading && (
          <span
            className="freight-pie-card__count"
            title={`${modeTotal} ${mode} shipments in total`}
          >
            {modeTotal.toLocaleString()}
            <span className="freight-pie-card__count-label">shipments</span>
          </span>
        )
      }
    >
      {loading ? (
        <div className="freight-pie-card__loading">Loading…</div>
      ) : (
        <>
          <DonutChart
            slices={slices}
            size={96}
            thickness={8}
            centerValue={modeTotal}
            centerLabel="total"
          />
          <div className="freight-pie-card__legend">
            {slices.map(s => (
              <DonutLegendRow key={s.label} color={s.color} label={s.label} value={s.value} />
            ))}
          </div>
        </>
      )}
    </CardShell>
  );
}

// ── Headcount for the user's own department, + "Add New User" shortcut ─────────
function DepartmentUsersCard({ mode }: { mode: FreightMode }) {
  const router = useRouter();
  const [data, setData] = useState<DeptUsers | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/dashboard/super/department-users?mode=${mode}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(result => setData(result.data ?? null))
      .catch(err => console.error('Failed to load department users:', err))
      .finally(() => setLoading(false));
  }, [mode]);

  const total = data?.total ?? 0;
  const byRole = data?.by_role ?? {};
  const deskName = mode === 'AIR' ? 'Air Freight' : 'Sea Freight';
  const roleRows = Object.entries(byRole).sort((a, b) => b[1] - a[1]);

  return (
    <CardShell
      icon={<Users size={18} color="var(--c-chart-1)" />}
      iconTint="var(--c-chart-1)"
      title="Department Users"
      headerRight={
        <button
          type="button"
          className="freight-pie-card__action"
          onClick={() => router.push('/Super_user/create-user')}
        >
          <UserPlus size={14} /> Add New User
        </button>
      }
    >
      {loading ? (
        <div className="freight-pie-card__loading">Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontSize: 'var(--fs-xl)',
                fontWeight: 'var(--fw-bold)' as any,
                color: 'var(--c-text-strong)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {total.toLocaleString()}
            </span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)' }}>
              users in {deskName}
            </span>
          </div>

          {roleRows.length > 0 ? (
            <div className="freight-pie-card__legend">
              {roleRows.map(([role, count]) => (
                <DonutLegendRow
                  key={role}
                  color={ROLE_COLORS[role] ?? 'var(--c-border)'}
                  label={ROLE_LABELS[role] ?? role}
                  value={count}
                />
              ))}
            </div>
          ) : (
            <div className="freight-pie-card__loading">
              No users assigned to this department yet.
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
}

export default function SuperDashboardAnalytics({ mode }: { mode: FreightMode }) {
  return (
    <section className="admin-dashboard-analytics">
      <FreightCard mode={mode} />
      <DepartmentUsersCard mode={mode} />
    </section>
  );
}
