'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Mail, ShieldCheck } from 'lucide-react';
import StatCard from '@/components/AdminUser/StatCard';

type AdminMetrics = {
  success_rate: number;
  total_emails: number;
  active_alerts: number;
  critical_alerts?: number;
  alert_shipments?: number;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

// Each button opens its digest log page with ?autosend=1, which makes that page
// run "Send Digest Now" automatically (no confirm prompt) on arrival.
const DIGEST_TARGETS = [
  { label: 'Super User', path: '/admin/super-digest' },
  { label: 'Operation User', path: '/admin/operations-digest' },
  { label: 'Sales User', path: '/admin/sales-digest' },
];

const digestBtnStyle: React.CSSProperties = {
  flex: '1 1 auto',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--c-border-light)',
  background: 'var(--c-surface-sunken)',
  color: 'var(--c-text-strong)',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.2,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : '0';
}

export default function AdminOverviewMetricCards() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setError(null);
        const response = await fetch(`${API}/api/dashboard/admin/metrics`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        setMetrics(result.data ?? null);
      } catch (err) {
        console.error('Failed to load admin dashboard metrics:', err);
        setError('Could not load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <StatCard
        title="Milestone Success Rate"
        value={loading ? '...' : `${metrics?.success_rate ?? 0}%`}
        hint={error ?? 'Completed milestones percentage'}
        icon={<ShieldCheck size={18} color="var(--c-success)" />}
      />

      {/* Send Digest Email — one button per role; clicking sends that digest */}
      <div className="stat-card">
        <div className="stat-card__top">
          <div className="stat-card__left">
            <div className="stat-card__iconWrap">
              <Mail size={18} color="var(--c-accent)" />
            </div>
            <div className="stat-card__title">Send Digest Email</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {DIGEST_TARGETS.map((target) => (
            <button
              key={target.path}
              type="button"
              style={digestBtnStyle}
              onClick={() => router.push(`${target.path}?autosend=1`)}
            >
              {target.label}
            </button>
          ))}
        </div>

        <div className="stat-card__hint">Opens the digest page and sends it</div>
      </div>

      <StatCard
        title="Active Alerts"
        value={loading ? '...' : formatNumber(metrics?.active_alerts ?? 0)}
        // An alert is one overdue milestone, so the count runs well ahead of the
        // number of shipments. Spell both out rather than leaving it ambiguous.
        hint={
          loading
            ? 'Overdue milestones requiring attention'
            : `${formatNumber(metrics?.critical_alerts ?? 0)} critical, across ${formatNumber(metrics?.alert_shipments ?? 0)} shipments`
        }
        icon={<AlertTriangle size={18} color="var(--c-danger)" />}
      />
    </div>
  );
}
