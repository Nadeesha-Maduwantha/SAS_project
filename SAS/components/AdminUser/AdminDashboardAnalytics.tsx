'use client';

import { useEffect, useState } from 'react';
import { Anchor, Plane } from 'lucide-react';
import SyncSummaryCard from '@/components/AdminUser/SyncSummaryCard';
import DonutChart, { DonutLegendRow, type DonutSlice } from '@/components/shared/DonutChart';
import '@/styles/AdminStyles/AdminDashboardAnalytics.css';

type DepartmentMode = 'AIR' | 'SEA';

type DepartmentStats = {
  total?: number;
  on_time?: number;
  delayed?: number;
  delivered_today?: number;
  other?: number;
};

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:5000';

function FreightPieCard({ mode }: { mode: DepartmentMode }) {
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch(`${API}/api/shipments/stats/department/${mode}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        setStats(result.data ?? null);
      } catch (error) {
        console.error(`Failed to load ${mode} freight stats:`, error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [mode]);

  const isAir = mode === 'AIR';
  const title = isAir ? 'Air Freight' : 'Sea Freight';
  const accent = isAir ? 'var(--c-chart-1)' : 'var(--c-chart-2)';
  const ongoing = stats?.on_time ?? 0;
  const overdue = stats?.delayed ?? 0;
  const completed = stats?.delivered_today ?? 0;
  // Neither on time, delayed, nor delivered — pickup status still blank/pending.
  const other = stats?.other ?? 0;
  // Every shipment with this transport mode. With the "Other stage" slice the
  // four slices now sum to this, so it doubles as the donut centre value.
  const modeTotal = stats?.total ?? ongoing + overdue + completed + other;

  const slices: DonutSlice[] = [
    { label: 'Ongoing', value: ongoing, color: accent },
    { label: 'Overdue', value: overdue, color: 'var(--c-chart-5)' },
    { label: 'Completed', value: completed, color: 'var(--c-chart-3)' },
    { label: 'Other stage', value: other, color: 'var(--c-chart-6)' },
  ];

  return (
    <div className="freight-pie-card">
      <div className="freight-pie-card__head">
        <div
          className="freight-pie-card__icon"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)` }}
        >
          {isAir ? <Plane size={20} color={accent} /> : <Anchor size={20} color={accent} />}
        </div>
        <h2 className="freight-pie-card__title">{title}</h2>

        {!loading && (
          <span
            className="freight-pie-card__count"
            title={`${modeTotal} ${mode} shipments in total`}
          >
            {modeTotal.toLocaleString()}
            <span className="freight-pie-card__count-label">shipments</span>
          </span>
        )}
      </div>

      <div className="freight-pie-card__body">
        {loading ? (
          <div className="freight-pie-card__loading">Loading...</div>
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
              {slices.map((slice) => (
                <DonutLegendRow
                  key={slice.label}
                  color={slice.color}
                  label={slice.label}
                  value={slice.value}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardAnalytics() {
  return (
    <section className="admin-dashboard-analytics">
      <div className="admin-dashboard-analytics__sync">
        <SyncSummaryCard />
      </div>

      <div className="admin-dashboard-analytics__charts">
        <FreightPieCard mode="AIR" />
        <FreightPieCard mode="SEA" />
      </div>
    </section>
  );
}
