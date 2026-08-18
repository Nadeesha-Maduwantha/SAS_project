'use client';

// =============================================================
//  DashboardMetricCards.tsx
//  Path: components/AdminUser/DashboardMetricCards.tsx
//
//  4 equal-size stat cards in a 4-column grid:
//  [AIR Dept] [SEA Dept] [Critical Milestones] [Shipment Summary]
// =============================================================

import { useState, useEffect } from 'react';
import { Plane, Anchor, AlertCircle, Package, CheckCircle2 } from 'lucide-react';
import DonutChart, { DonutLegendRow } from '@/components/shared/DonutChart';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5001';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { Authorization: `Bearer ${token}` };
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function SpinDot() {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      border: '2px solid #E5E7EB', borderTopColor: '#9CA3AF',
      animation: 'dmcSpin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <SpinDot />
      <span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading…</span>
    </div>
  );
}

// ── Card shell — same size for all 4 ──────────────────────────────────────────
function CardShell({
  icon, iconBg, iconColor, title, badge, children,
}: {
  icon:       React.ReactNode;
  iconBg:     string;
  iconColor:  string;
  title:      string;
  badge?:     React.ReactNode;
  children:   React.ReactNode;
}) {
  return (
    <div style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
        padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', minHeight: 148,
        overflow: 'hidden', 
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #F3F4F6',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: '-0.01em' }}>
            {title}
          </span>
        </div>
        {badge}
      </div>

      {/* Body */}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

// ── LED Ticker ─────────────────────────────────────────────────────────────────
interface TickerItem {
  key:       string;
  jobNumber: string;
  consignee: string;
  milestone: string;
}

function Ticker({ items }: { items: TickerItem[] }) {
  if (!items.length) return null;

  const speed   = Math.max(14, items.length * 4);
  const content = items.map(item => (
    <span key={item.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 24, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#B91C1C' }}>
        #{item.jobNumber}
      </span>
      <span style={{ color: '#D1D5DB', fontSize: 10 }}>·</span>
      <span style={{ fontSize: 11, color: '#6B7280' }}>{item.consignee}</span>
      <span style={{ color: '#D1D5DB', fontSize: 10 }}>·</span>
      <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{item.milestone}</span>
    </span>
  ));

  return (
    <div style={{ overflow: 'hidden', position: 'relative', height: 20, marginTop: 10 }}>
      {/* fade masks */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, zIndex: 2, background: 'linear-gradient(to right,#fff,transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 16, zIndex: 2, background: 'linear-gradient(to left,#fff,transparent)', pointerEvents: 'none' }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', animation: `dmcTicker ${speed}s linear infinite`, willChange: 'transform' }}>
        {content}{content}
      </div>
    </div>
  );
}

// ── Card 1 & 2: Department ─────────────────────────────────────────────────────
function DeptCard({ mode }: { mode: 'AIR' | 'SEA' }) {
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/shipments/stats/department/${mode}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mode]);

  const isAir  = mode === 'AIR';
  const accent = isAir ? '#3B82F6' : '#6366F1';

  const ongoing   = stats?.on_time         ?? 0;
  const overdue   = stats?.delayed         ?? 0;
  const completed = stats?.delivered_today ?? 0;

  const slices = [
    { label: 'Ongoing',   value: ongoing,   color: accent    },
    { label: 'Overdue',   value: overdue,   color: '#EF4444' },
    { label: 'Completed', value: completed, color: '#10B981' },
  ];

  return (
    <CardShell
      icon={isAir ? <Plane size={14} color={accent} /> : <Anchor size={14} color={accent} />}
      iconBg={`${accent}18`}
      iconColor={accent}
      title={isAir ? 'Air Freight' : 'Sea Freight'}
    >
      {loading ? <Loading /> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DonutChart
            slices={slices}
            centerValue={ongoing + overdue + completed}
            centerLabel="total"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {slices.map(s => (
              <DonutLegendRow key={s.label} color={s.color} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}

// ── Card 3: Critical Milestones + LED ticker ───────────────────────────────────
function CriticalCard() {
  const [total,   setTotal]   = useState(0);
  const [items,   setItems]   = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/alerts/active`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const groups: any[] = d.data || [];
        let count = 0;
        const list: TickerItem[] = [];

        groups.forEach(g => {
          (g.alerts || []).forEach((a: any) => {
            if (a.is_critical) {
              count++;
              list.push({
                key:       `${g.shipment_id}-${a.milestone_id}`,
                jobNumber: g.job_number,
                consignee: g.consignee_name,
                milestone: a.name,
              });
            }
          });
        });

        setTotal(count);
        setItems(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const badge = !loading ? (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: total > 0 ? '#FEE2E2' : '#F3F4F6',
      color:      total > 0 ? '#B91C1C' : '#9CA3AF',
      border:     `1px solid ${total > 0 ? '#FECACA' : '#E5E7EB'}`,
    }}>
      {total}
    </span>
  ) : undefined;

  return (
    <CardShell
      icon={<AlertCircle size={14} color="#DC2626" />}
      iconBg="#FEE2E2"
      iconColor="#DC2626"
      title="Critical Milestones"
      badge={badge}
    >
      {loading ? <Loading /> : total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <CheckCircle2 size={13} color="#10B981" />
          <span style={{ fontSize: 12, color: '#6B7280' }}>None right now</span>
        </div>
      ) : (
        <>
          {/* Big number */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#B91C1C', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {total}
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              critical {total === 1 ? 'milestone' : 'milestones'}
            </span>
          </div>

          {/* LED scrolling ticker */}
          <Ticker items={items} />
        </>
      )}
    </CardShell>
  );
}

// ── Card 4: Shipment Summary ───────────────────────────────────────────────────
function ShipmentSummaryCard() {
  const [stats,   setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/shipments/stats`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    <CardShell
      icon={<Package size={14} color="#10B981" />}
      iconBg="#D1FAE5"
      iconColor="#10B981"
      title="Shipment Summary"
    >
      {loading ? <Loading /> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DonutChart slices={slices} centerValue={total} centerLabel="total" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {slices.map(s => (
              <DonutLegendRow key={s.label} color={s.color} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}

// ── Exported: 4 equal-width cards in a row ────────────────────────────────────
export default function DashboardMetricCards() {
  return (
    <>
      <style>{`
        @keyframes dmcSpin   { to { transform: rotate(360deg) } }
        @keyframes dmcTicker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}>
        <DeptCard mode="AIR" />
        <DeptCard mode="SEA" />
        <CriticalCard />
        <ShipmentSummaryCard />
      </div>
    </>
  );
}