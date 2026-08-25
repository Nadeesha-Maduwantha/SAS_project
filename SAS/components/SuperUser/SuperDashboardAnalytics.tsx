'use client';

// =============================================================
//  SuperDashboardAnalytics.tsx
//
//  Two cards side by side on the Super User dashboard:
//    left  — Sea Freight breakdown (AIR is deliberately not shown here)
//    right — overall shipment summary
//
//  Reuses the admin card styling so both dashboards look identical.
// =============================================================

import { useEffect, useState } from 'react';
import { Anchor, Package } from 'lucide-react';
import DonutChart, { DonutLegendRow, type DonutSlice } from '@/components/shared/DonutChart';
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

// ── Sea freight ───────────────────────────────────────────────────────────────
function SeaFreightCard() {
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/shipments/stats/department/SEA`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(result => setStats(result.data ?? null))
      .catch(err => console.error('Failed to load SEA freight stats:', err))
      .finally(() => setLoading(false));
  }, []);

  const ongoing = stats?.on_time ?? 0;
  const overdue = stats?.delayed ?? 0;
  const completed = stats?.delivered_today ?? 0;

  const slices: DonutSlice[] = [
    { label: 'Ongoing',   value: ongoing,   color: 'var(--c-chart-2)' },
    { label: 'Overdue',   value: overdue,   color: 'var(--c-chart-5)' },
    { label: 'Completed', value: completed, color: 'var(--c-chart-3)' },
  ];

  return (
    <CardShell
      icon={<Anchor size={18} color="var(--c-chart-2)" />}
      iconTint="var(--c-chart-2)"
      title="Sea Freight"
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

// ── Shipment summary ──────────────────────────────────────────────────────────
function ShipmentSummaryCard() {
  const [stats, setStats] = useState<ShipmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/shipments/stats`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(result => setStats(result.data ?? null))
      .catch(err => console.error('Failed to load shipment stats:', err))
      .finally(() => setLoading(false));
  }, []);

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

export default function SuperDashboardAnalytics() {
  return (
    <section className="admin-dashboard-analytics">
      <SeaFreightCard />
      <ShipmentSummaryCard />
    </section>
  );
}
