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
import { useAuth } from '@/lib/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

type Scope = 'admin' | 'operation' | 'sales' | 'super';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { Authorization: `Bearer ${token}` };
}

// Build the ?role=&email=&department= scope query for the current viewer.
function scopeQuery(scope: Scope | undefined, u: { email?: string; department?: string }) {
  if (!scope || scope === 'admin') return '';
  const p = new URLSearchParams({ role: scope });
  if (scope === 'super') p.set('department', u.department ?? '');
  else p.set('email', u.email ?? '');
  return `?${p.toString()}`;
}

function SpinDot() {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      border: '2px solid #E5E7EB', borderTopColor: 'var(--gray-400)',
      animation: 'udmcSpin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

function StatRow({ icon, label, value, color = 'var(--gray-900)' }: {
  icon: React.ReactNode; label: string; value: number | string; color?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray-500)' }}>
        {icon} {label}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

// ── My Shipments card ──────────────────────────────────────────────────────────
function MyShipmentsCard({ qs }: { qs: string }) {
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/shipments/stats${qs}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [qs]);

  return (
    <div style={card}>
      <div style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={14} color="#10B981" />
          </div>
          <span style={title}>My Shipments</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SpinDot /><span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Loading…</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--green)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {stats?.total ?? 0}
            </span>
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>total</span>
          </div>
          <StatRow icon={<TrendingUp    size={11} />} label="Active"    value={(stats?.total ?? 0) - (stats?.delivered ?? 0)} />
          <StatRow icon={<AlertTriangle size={11} />} label="Delayed"   value={stats?.delayed    ?? 0} color="var(--red)" />
          <StatRow icon={<CheckCircle2  size={11} />} label="Completed" value={stats?.delivered  ?? 0} color="var(--green)" />
        </>
      )}
    </div>
  );
}

// ── My Alerts card ─────────────────────────────────────────────────────────────
function MyAlertsCard({ qs }: { qs: string }) {
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/alerts/active${qs}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const groups: any[] = d.data || [];
        const total = groups.reduce((sum: number, g: any) => sum + (g.alert_count || 0), 0);
        setCount(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [qs]);

  return (
    <div style={card}>
      <div style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={14} color="#DC2626" />
          </div>
          <span style={title}>My Alerts</span>
        </div>
        {!loading && count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
            {count}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SpinDot /><span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Loading…</span>
        </div>
      ) : count === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <CheckCircle2 size={13} color="#10B981" />
          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>No active alerts</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--red)', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {count}
          </span>
          <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
            overdue {count === 1 ? 'milestone' : 'milestones'}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Exported: 2 equal cards ────────────────────────────────────────────────────
export default function UserDashboardMetricCards({ scope }: { scope?: Scope }) {
  const user = useAuth();
  const qs = scopeQuery(scope, user);
  return (
    <>
      <style>{`@keyframes udmcSpin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <MyShipmentsCard qs={qs} />
        <MyAlertsCard qs={qs} />
      </div>
    </>
  );
}

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--card-border-color)', borderRadius: 12,
  padding: '16px 18px', boxShadow: 'var(--card-shadow)',
  display: 'flex', flexDirection: 'column', minHeight: 140,
};
const hdr: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--gray-100)',
};
const title: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', letterSpacing: '-0.01em',
};