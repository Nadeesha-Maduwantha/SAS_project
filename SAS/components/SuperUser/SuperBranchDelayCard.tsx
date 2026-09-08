'use client';

// =============================================================
//  SuperBranchDelayCard.tsx
//
//  Full-width card showing the delay rate of every branch as a bar
//  chart. Bars are scaled against a fixed 0-100 axis so "57%" reads
//  as just over half the width rather than being stretched to fill.
// =============================================================

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import BarChart, { type BarRow } from '@/components/shared/BarChart';
import '@/styles/AdminStyles/AdminDashboardAnalytics.css';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://127.0.0.1:5000';

// Below this many shipments a percentage is noise — one late shipment out
// of one reads as 100%. Those bars are muted so they don't dominate.
const LOW_VOLUME = 3;

type BranchRow = {
  branch:  string;
  total:   number;
  delayed: number;
  rate:    number;
};

export default function SuperBranchDelayCard() {
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/shipments/stats/branch`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(result => setRows(result.data ?? []))
      .catch(err => console.error('Failed to load branch delay stats:', err))
      .finally(() => setLoading(false));
  }, []);

  // The API already sorts worst rate first, which is the order we want.
  const bars: BarRow[] = rows.map(r => ({
    label:   r.branch,
    value:   r.rate,
    caption: `${r.delayed}/${r.total}`,
    color:   r.total < LOW_VOLUME ? 'var(--c-border)' : 'var(--c-chart-5)',
  }));

  const hasLowVolume = rows.some(r => r.total < LOW_VOLUME);

  return (
    <div className="freight-pie-card" style={{ marginTop: 14 }}>
      <div className="freight-pie-card__head">
        <div
          className="freight-pie-card__icon"
          style={{ backgroundColor: 'color-mix(in srgb, var(--c-chart-1) 10%, transparent)' }}
        >
          <Building2 size={18} color="var(--c-chart-1)" />
        </div>
        <h2 className="freight-pie-card__title">Delay Rate by Branch</h2>
      </div>

      <div style={{ paddingTop: 16 }}>
        {loading ? (
          <div className="freight-pie-card__loading">Loading…</div>
        ) : bars.length === 0 ? (
          <div className="freight-pie-card__loading">No branch data</div>
        ) : (
          <>
            <BarChart rows={bars} max={100} unit="%" />

            {hasLowVolume && (
              <div style={{
                marginTop: 12,
                fontSize: 'var(--fs-xs)',
                color: 'var(--c-text-subtle)',
              }}>
                Greyed bars have fewer than {LOW_VOLUME} shipments — the percentage
                is not meaningful at that volume.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
