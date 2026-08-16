'use client';

// =============================================================
//  UserDashboardMetricCards.tsx
//  Path: components/shared/UserDashboardMetricCards.tsx
//
//  Stat cards for Sales + Operations dashboards.
//  For now shows all shipment stats.
//  TODO: filter by assigned user once auth wiring is complete.
// =============================================================

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { Authorization: `Bearer ${token}` };
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

function StatRow({ icon, label, value, color = '#111827' }: {
  icon: React.ReactNode; label: string; value: number | string; color?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280' }}>
        {icon} {label}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

// ── My Shipments card ──────────────────────────────────────────────────────────
function MyShipmentsCard() {
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/shipments/stats`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#065F46', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats?.total ?? 0}
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>total</span>
          </div>
          <StatRow icon={<TrendingUp    size={11} />} label="Active"    value={(stats?.total ?? 0) - (stats?.delivered ?? 0)} />
          <StatRow icon={<AlertTriangle size={11} />} label="Delayed"   value={stats?.delayed    ?? 0} color="#B91C1C" />
          <StatRow icon={<CheckCircle2  size={11} />} label="Completed" value={stats?.delivered  ?? 0} color="#065F46" />
        </>
      )}
    </div>
  );
}

// ── My Alerts card ─────────────────────────────────────────────────────────────
function MyAlertsCard() {
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/alerts/active`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const groups: any[] = d.data || [];
        const total = groups.reduce((sum: number, g: any) => sum + (g.alert_count || 0), 0);
        setCount(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={card}>
      <div style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={14} color="#DC2626" />
          </div>
          <span style={title}>My Alerts</span>
        </div>
        {!loading && count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            {count}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SpinDot /><span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</span>
        </div>
      ) : count === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <CheckCircle2 size={13} color="#10B981" />
          <span style={{ fontSize: 12, color: '#6B7280' }}>No active alerts</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#B91C1C', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {count}
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>
            overdue {count === 1 ? 'milestone' : 'milestones'}
          </span>
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