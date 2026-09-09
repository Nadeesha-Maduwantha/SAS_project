'use client';

// =============================================================
//  SuperDashboardAnalytics.tsx
//
//  Two cards side by side on the Super User dashboard:
//    left  — breakdown for the user's own freight desk (air or sea)
//    right — shipment summary, restricted to that same desk
//
//  A super user runs one desk only, so both cards are filtered by `mode`
//  rather than showing the whole company.
//
//  Reuses the admin card styling so both dashboards look identical.
// =============================================================

import { useEffect, useState } from 'react';
import { Anchor, Package, Plane } from 'lucide-react';
import DonutChart, { DonutLegendRow, type DonutSlice } from '@/components/shared/DonutChart';
import type { FreightMode } from '@/lib/departments';
import '@/styles/AdminStyles/AdminDashboardAnalytics.css';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:5000';

type DepartmentStats = {
  on_time?: number;
  delayed?: number;
  delivered_today?: number;
};

type ShipmentStats = {
  total?: number;
  delivered?: number;
  delayed?: number;
};

function CardShell({
  icon,
  iconTint,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconTint: string;
  title: string;
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

  const slices: DonutSlice[] = [
    { label: 'Ongoing',   value: ongoing,   color: accent },
    { label: 'Overdue',   value: overdue,   color: 'var(--c-chart-5)' },
    { label: 'Completed', value: completed, color: 'var(--c-chart-3)' },
  ];

  return (
    <CardShell
      icon={isAir ? <Plane size={18} color={accent} /> : <Anchor size={18} color={accent} />}
      iconTint={accent}
      title={isAir ? 'Air Freight' : 'Sea Freight'}
    >
      {loading ? (
        <div className="freight-pie-card__loading">Loading…</div>
      ) : (
        <>
          <DonutChart
            slices={slices}
            size={96}
            thickness={8}
            centerValue={ongoing + overdue + completed}
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

// ── Shipment summary, restricted to the user's own desk ───────────────────────
function ShipmentSummaryCard({ mode }: { mode: FreightMode }) {
  const [stats, setStats] = useState<ShipmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/shipments/stats?mode=${mode}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(result => setStats(result.data ?? null))
      .catch(err => console.error('Failed to load shipment stats:', err))
      .finally(() => setLoading(false));
  }, [mode]);

  const total = stats?.total ?? 0;
  const completed = stats?.delivered ?? 0;
  const delayed = stats?.delayed ?? 0;
  // Whatever is neither finished nor flagged late is still moving.
  const active = Math.max(0, total - completed - delayed);

  const slices: DonutSlice[] = [
    { label: 'Completed', value: completed, color: 'var(--c-chart-3)' },
    { label: 'Active',    value: active,    color: 'var(--c-chart-1)' },
    { label: 'Delayed',   value: delayed,   color: 'var(--c-chart-5)' },
  ];

  return (
    <CardShell
      icon={<Package size={18} color="var(--c-chart-3)" />}
      iconTint="var(--c-chart-3)"
      title="Shipment Summary"
    >
      {loading ? (
        <div className="freight-pie-card__loading">Loading…</div>
      ) : (
        <>
          <DonutChart
            slices={slices}
            size={96}
            thickness={8}
            centerValue={total}
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

export default function SuperDashboardAnalytics({ mode }: { mode: FreightMode }) {
  return (
    <section className="admin-dashboard-analytics">
      <FreightCard mode={mode} />
      <ShipmentSummaryCard mode={mode} />
    </section>
  );
}
