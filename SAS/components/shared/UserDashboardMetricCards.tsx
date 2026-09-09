'use client';

// =============================================================
//  UserDashboardMetricCards.tsx
//  Path: components/shared/UserDashboardMetricCards.tsx
//
//  Stat cards for Sales + Operations dashboards, scoped to the viewer.
//
//  Both endpoints do the scoping server-side from ?role=&email=
//  (or &department= for a super user) — see Backend/services/scope.py.
//  The card just passes that query string through.
// =============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, AlertTriangle, AlertCircle, CheckCircle2, TrendingUp, Eye } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiUrl, authHeaders } from '@/lib/api';

type Scope = 'admin' | 'operation' | 'sales' | 'super';

// The per-role Alert Dashboard page + how it scopes /api/alerts. The "My Alerts"
// card reads the SAME data so its counts match that page's table, and its
// "View alerts" button opens that page.
const ALERT_PAGE: Record<Scope, string> = {
  admin:     '/admin/alerts',
  operation: '/operation_user/alerts',
  sales:     '/sales_user/alerts',
  super:     '/Super_user/alerts',
};

function alertsQuery(scope: Scope | undefined, u: { email?: string; department?: string }) {
  if (scope === 'operation') return u.email ? `?assigned_email=${encodeURIComponent(u.email)}` : '';
  if (scope === 'sales')     return u.email ? `?email=${encodeURIComponent(u.email)}` : '';
  if (scope === 'super')     return u.department ? `?department=${encodeURIComponent(u.department)}` : '';
  return ''; // admin — every alert
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
    fetch(apiUrl(`/api/shipments/stats${qs}`), { headers: authHeaders() })
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
// Reads the SAME source as the role's Alert Dashboard page (GET /api/alerts,
// scoped by assigned_email / email / department). Headline = alerts still in
// "Get Action" (must take action); rows split those by priority the way that
// page does — is_critical → Critical, otherwise → Medium. The button opens the
// Alert Dashboard page to work through them in detail.
function MyAlertsCard({ scope, user }: { scope?: Scope; user: { email?: string; department?: string } }) {
  const router = useRouter();
  const [stats,   setStats]   = useState<{ total: number; critical: number; medium: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const q         = alertsQuery(scope, user);
  const viewRoute = ALERT_PAGE[scope ?? 'admin'];

  useEffect(() => {
    fetch(apiUrl(`/api/alerts${q}`), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const rows: any[] = d.data || [];
        // Match the Alert Dashboard page: any status that isn't explicitly
        // "Action Taken" / "Resolved" is treated as "Get Action".
        const needsAction = rows.filter(
          (r: any) => r.status !== 'Action Taken' && r.status !== 'Resolved',
        );
        const critical = needsAction.filter((r: any) => r.is_critical).length;
        const medium   = needsAction.filter((r: any) => !r.is_critical).length;
        setStats({ total: needsAction.length, critical, medium });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  const total    = stats?.total ?? 0;
  const critical = stats?.critical ?? 0;
  const medium   = stats?.medium ?? 0;

  return (
    <div style={card}>
      <div style={hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={14} color="#DC2626" />
          </div>
          <span style={title}>My Alerts</span>
        </div>
        {!loading && (
          <button
            onClick={() => router.push(viewRoute)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 7,
              background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Eye size={12} /> View alerts
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SpinDot /><span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Loading…</span>
        </div>
      ) : total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <CheckCircle2 size={13} color="#10B981" />
          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>No alerts to action</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--red)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {total}
            </span>
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
              {total === 1 ? 'alert to action' : 'alerts to action'}
            </span>
          </div>
          <StatRow icon={<AlertTriangle size={11} />} label="Critical" value={critical} color="var(--red)" />
          <StatRow icon={<AlertCircle   size={11} />} label="Medium"   value={medium}   color="#D97706" />
        </>
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
        <MyAlertsCard scope={scope} user={user} />
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
