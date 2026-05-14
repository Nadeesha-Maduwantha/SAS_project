'use client';

// =============================================================
//  PinnedTableStatCard.tsx
//  Path: components/shared/PinnedTableStatCard.tsx
//
//  Shows a user's pinned custom table as a dashboard stat card.
//  Title = consignee name (from filters) or table name.
//  Body = LED-style ticker scrolling job numbers + statuses.
//  Clicking navigates to /admin/custom-tables?tab=<tableId>
// =============================================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, RefreshCw, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

interface PinnedTable {
  id:          string;
  name:        string;
  data_source: 'shipments' | 'alerts';
  filters:     Record<string, string>;
}

interface TickerItem {
  id:     string;
  label:  string;
  status: string;
}

function statusDot(status: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('delayed') || s.includes('overdue') || s.includes('critical')) return '#EF4444';
  if (s.includes('future') || s.includes('pending')) return '#F59E0B';
  if (s.includes('completed') || s.includes('delivered') || s === 'resolved') return '#10B981';
  return '#9CA3AF';
}

// ── Ticker strip ──────────────────────────────────────────────────────────────
function TickerStrip({ items }: { items: TickerItem[] }) {
  const stripRef = useRef<HTMLDivElement>(null);

  if (!items.length) {
    return (
      <div style={{ fontSize: 12, color: '#9CA3AF', padding: '4px 0', fontStyle: 'italic' }}>
        No records
      </div>
    );
  }

  // Build the ticker string — duplicated so it scrolls seamlessly
  const content = items.map(item => (
    <span key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 24 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot(item.status), flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#374151' }}>
        {item.label}
      </span>
      <span style={{ fontSize: 10, color: '#9CA3AF' }}>{item.status}</span>
      <span style={{ color: '#E5E7EB', marginLeft: 4 }}>·</span>
    </span>
  ));

  return (
    <div style={{ overflow: 'hidden', position: 'relative', height: 22, marginTop: 8 }}>
      {/* Fade masks on left and right */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 2,
        background: 'linear-gradient(to right, #fff, transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, zIndex: 2,
        background: 'linear-gradient(to left, #fff, transparent)',
        pointerEvents: 'none',
      }} />

      {/* Scrolling track — duplicated for seamless loop */}
      <div ref={stripRef} style={{
        display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
        animation: `tickerScroll ${Math.max(8, items.length * 2.5)}s linear infinite`,
        willChange: 'transform',
      }}>
        {content}
        {content}  {/* duplicate for seamless loop */}
      </div>
    </div>
  );
}

// ── Single stat card ──────────────────────────────────────────────────────────
function PinnedStatCard({ table }: { table: PinnedTable }) {
  const router = useRouter();
  const [items,    setItems]    = useState<TickerItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [counts,   setCounts]   = useState({ total: 0, active: 0, issues: 0 });

  const fetch_data = () => {
    setLoading(true);
    fetch(`${API}/api/custom-tables/${table.id}/data`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const rows = d.data || [];
        const isShipments = table.data_source === 'shipments';

        const tickerItems: TickerItem[] = rows.slice(0, 30).map((r: any) => ({
          id:     r.id,
          label:  isShipments ? `#${r.job_number}` : (r.name || r.id?.slice(0, 8)),
          status: isShipments ? (r.pickup_date_status || r.llm_identified_type || '—') : (r.status || '—'),
        }));

        const active = isShipments
          ? rows.filter((r: any) => !(r.llm_identified_type || '').toLowerCase().includes('delivered')).length
          : rows.filter((r: any) => !['completed', 'resolved'].includes((r.status || '').toLowerCase())).length;

        const issues = isShipments
          ? rows.filter((r: any) => (r.pickup_date_status || '').toLowerCase().includes('delayed')).length
          : rows.filter((r: any) => r.is_critical).length;

        setItems(tickerItems);
        setCounts({ total: rows.length, active, issues });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch_data(); }, [table.id]);

  const title = table.filters?.consignee_name || table.name;
  const subtitle = table.data_source === 'shipments' ? 'Shipments' : 'Alerts';

  return (
    <div
      onClick={() => router.push(`/admin/custom_tables?tab=${table.id}`)}
      style={{
        background:   '#fff',
        border:       '1px solid #E5E7EB',
        borderRadius: 12,
        padding:      '16px 18px',
        cursor:       'pointer',
        transition:   'box-shadow 0.15s, transform 0.15s',
        position:     'relative',
        overflow:     'hidden',
        minHeight:    100,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      {/* Top row: title + link icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#9CA3AF',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2,
          }}>
            {subtitle}
          </div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#111827',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </div>
        </div>
        <ExternalLink size={13} color="#D1D5DB" style={{ flexShrink: 0, marginTop: 2 }} />
      </div>

      {/* Count row */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
          <Loader2 size={13} color="#9CA3AF" style={{ animation: 'dtSpin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
            {counts.total}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{counts.active} active</span>
            {counts.issues > 0 && (
              <span style={{ fontSize: 10, color: '#B91C1C', fontWeight: 600 }}>
                {counts.issues} {table.data_source === 'shipments' ? 'delayed' : 'critical'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* LED ticker */}
      {!loading && <TickerStrip items={items} />}

      {/* Refresh button */}
      <button
        onClick={e => { e.stopPropagation(); fetch_data(); }}
        style={{
          position: 'absolute', top: 8, right: 28,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#D1D5DB', padding: 4, borderRadius: 4,
          display: 'flex', alignItems: 'center',
          transition: 'color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#9CA3AF')}
        onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
        title="Refresh"
      >
        <RefreshCw size={11} />
      </button>
    </div>
  );
}

// ── Exported component: fetches pinned tables and renders grid ─────────────────
export default function PinnedTableStatCards() {
  const [tables,  setTables]  = useState<PinnedTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/custom-tables`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setTables((d.data || []).filter((t: any) => t.pinned_to_dashboard)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || tables.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes dtSpin { to { transform: rotate(360deg) } }
        @keyframes tickerScroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Pinned Tables
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(tables.length, 4)}, 1fr)`,
          gap: 12,
        }}>
          {tables.map(t => <PinnedStatCard key={t.id} table={t} />)}
        </div>
      </div>
    </>
  );
}