'use client';

// =============================================================
//  UserDashboardMetricCards.tsx
//  Path: components/shared/UserDashboardMetricCards.tsx
//
//  Stat cards for Sales + Operations dashboards, scoped to the signed-in user.
//
//  The two roles own shipments differently:
//    operation user — assigned to individual milestones (assigned_email)
//    sales user     — owns the shipment itself (sales_user_email)
//  so the query param depends on the role, not just the email.
// =============================================================

import { useState, useEffect } from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import DonutChart, { DonutLegendRow } from '@/components/shared/DonutChart';
import { useAuth } from '@/lib/hooks/useAuth';
import { normalizeRole } from '@/lib/roles';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { Authorization: `Bearer ${token}` };
}

/**
 * Query string that narrows an endpoint to this user. Empty for any other
 * role, which leaves the endpoint unfiltered.
 *
 * `salesParam` differs per endpoint — /api/shipments/stats calls it
 * sales_user_email, /api/alerts just calls it email.
 */
function ownershipQuery(role: string, email: string, salesParam: string): string {
  if (!email) return '';
  const key = normalizeRole(role);
  if (key === 'operationuser') return `?assigned_email=${encodeURIComponent(email)}`;
  if (key === 'salesuser')     return `?${salesParam}=${encodeURIComponent(email)}`;
  return '';
}

function SpinDot() {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      border: '2px solid #E5E7EB', borderTopColor: '#9CA3AF',
      animation: 'udmcSpin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

// ── My Shipments card ──────────────────────────────────────────────────────────
function MyShipmentsCard() {
  const { email, role } = useAuth();
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = ownershipQuery(role, email, 'sales_user_email');
    fetch(`${API}/api/shipments/stats${query}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [role, email]);

  const total     = stats?.total     ?? 0;
  const completed = stats?.delivered ?? 0;
  const delayed   = stats?.delayed   ?? 0;
  // Whatever is neither finished nor flagged late is still moving.
  const active    = Math.max(0, total - completed - delayed);

  const slices = [
    { label: 'Completed', value: completed, color: '#10B981' },
    { label: 'Active',    value: active,    color: '#3B82F6' },
    { label: 'Delayed',   value: delayed,   color: '#EF4444' },
  ];

  return (
    <div style={card}>
      <div style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={14} color="#10B981" />
          </div>
          <span style={title}>My Shipments</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SpinDot /><span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DonutChart slices={slices} centerValue={total} centerLabel="total" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {slices.map(s => (
              <DonutLegendRow key={s.label} color={s.color} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Alerts card ─────────────────────────────────────────────────────────────
// Mirrors the three stat cards at the top of the alerts page — High Priority,
// Pending Review and Resolved — reading the same /api/alerts rows so the
// dashboard and that page can never disagree.
function MyAlertsCard() {
  const { email, role } = useAuth();
  const [stats,   setStats]   = useState<{ high: number; pending: number; resolved: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = ownershipQuery(role, email, 'email');
    fetch(`${API}/api/alerts${query}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const rows: any[] = d.data || [];
        setStats({
          high:     rows.filter(r => r.is_critical).length,
          pending:  rows.filter(r => r.status === 'Get Action').length,
          resolved: rows.filter(r => r.status === 'Resolved').length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [role, email]);

  const high = stats?.high ?? 0;

  const rows = [
    { label: 'High Priority', value: high,                 color: 'var(--c-chart-5)' },
    { label: 'Pending Review', value: stats?.pending ?? 0, color: 'var(--c-chart-4)' },
    { label: 'Resolved',      value: stats?.resolved ?? 0, color: 'var(--c-chart-3)' },
  ];

  return (
    <div style={card}>
      <div style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={14} color="#DC2626" />
          </div>
          <span style={title}>My Alerts</span>
        </div>
        {!loading && high > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            {high}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SpinDot /><span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DonutChart
            slices={rows.map(r => ({ label: r.label, value: r.value, color: r.color }))}
            centerValue={high + (stats?.pending ?? 0) + (stats?.resolved ?? 0)}
            centerLabel="alerts"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {rows.map(r => (
              <DonutLegendRow key={r.label} color={r.color} label={r.label} value={r.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Exported: 2 equal cards ────────────────────────────────────────────────────
export default function UserDashboardMetricCards() {
  return (
    <>
      <style>{`@keyframes udmcSpin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <MyShipmentsCard />
        <MyAlertsCard />
      </div>
    </>
  );
}

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
  padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  display: 'flex', flexDirection: 'column', minHeight: 140,
};
const hdr: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #F3F4F6',
};
const title: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: '-0.01em',
};