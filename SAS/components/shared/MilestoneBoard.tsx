'use client';

/**
 * MilestoneBoard — the Current Milestones view.
 *
 * Tabs: Completed / Overdue / Delayed (flat, filtered lists) + By Client
 * (grouped nested) + By Member (grouped nested, admin/super only — toggles
 * between the responsible person and the sales/ops user).
 *
 * Colour coding (per milestone row):
 *   completed → no colour   overdue → dark red   delayed → lighter red
 *   pending/ongoing → blue   field-name mismatch → yellow (overrides status)
 *
 * Data: GET /api/shipments/all-milestones
 *   { data: [ { shipment, milestones:[{status, due_date, field_alert, ...}] } ] }
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ── status → colour ────────────────────────────────────────────────────────────
type Tone = { label: string; bg: string; color: string; border: string; dot: string };
const NONE:     Tone = { label: 'Completed', bg: '#FFFFFF', color: '#6B7280', border: '#E5E7EB', dot: '#D1D5DB' };
const DARKRED:  Tone = { label: 'Overdue',   bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', dot: '#DC2626' };
const LIGHTRED: Tone = { label: 'Delayed',   bg: '#FFF1F2', color: '#E11D48', border: '#FECDD3', dot: '#FB7185' };
const BLUE:     Tone = { label: 'Pending',   bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' };
const YELLOW:   Tone = { label: 'Field mismatch', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', dot: '#F59E0B' };

function toneFor(m: any): Tone {
  if (m?.field_alert) return YELLOW;
  return (
    m?.status === 'overdue'   ? DARKRED :
    m?.status === 'delayed'   ? LIGHTRED :
    m?.status === 'completed' ? NONE :
    BLUE
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── icons ───────────────────────────────────────────────────────────────────────
const Chevron = ({ open }: { open: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
);
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ── types ────────────────────────────────────────────────────────────────────────
interface Props {
  apiBase?:     string;   // default http://localhost:5000
  detailBase?:  string;   // e.g. /admin/milestone_detail  → `${detailBase}?id=<shipmentId>`
  canByMember?: boolean;  // admin + super users only
}

type Tab = 'completed' | 'overdue' | 'delayed' | 'by_client' | 'by_member';

// ── status pill ──────────────────────────────────────────────────────────────────
function StatusPill({ m }: { m: any }) {
  const t = toneFor(m);
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 5, background: t.bg, color: t.color, border: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
      {m.field_alert ? 'Field mismatch' : t.label}
    </span>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────────
export default function MilestoneBoard({
  apiBase = 'http://localhost:5000',
  detailBase,
  canByMember = false,
}: Props) {
  const router = useRouter();
  const [rows, setRows]       = useState<any[]>([]);   // [{ shipment, milestones }]
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [tab, setTab]         = useState<Tab>('overdue');
  const [search, setSearch]   = useState('');
  const [dept, setDept]       = useState<'all' | 'AIR' | 'SEA'>('all');
  const [sort, setSort]       = useState('due_asc');
  const [memberBy, setMemberBy] = useState<'person' | 'sales'>('person');

  useEffect(() => {
    fetch(`${apiBase}/api/shipments/all-milestones`)
      .then(r => { if (!r.ok) throw new Error(`Server error: ${r.status}`); return r.json(); })
      .then(res => setRows(res.data ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [apiBase]);

  // ── flatten: one entry per milestone, carrying its shipment ──
  const flat = useMemo(() => {
    const out: any[] = [];
    for (const r of rows) for (const m of (r.milestones ?? [])) out.push({ s: r.shipment, m });
    return out;
  }, [rows]);

  const q = search.trim().toLowerCase();
  const matchSearch = (s: any, m: any) =>
    !q || [s.job_number, s.consignee_name, s.branch, s.transport_mode, m?.name,
           s.created_by_name, s.sales_user_name]
      .some(v => (v ?? '').toString().toLowerCase().includes(q));
  const matchDept = (s: any) => dept === 'all' || (s.transport_mode ?? '').toUpperCase() === dept;

  // ── counts ──
  const counts = useMemo(() => {
    const c = { completed: 0, overdue: 0, delayed: 0, pending: 0, mismatch: 0 };
    for (const { m } of flat) {
      if (m.field_alert) c.mismatch++;
      if (m.status === 'completed') c.completed++;
      else if (m.status === 'overdue') c.overdue++;
      else if (m.status === 'delayed') c.delayed++;
      else c.pending++;
    }
    return c;
  }, [flat]);

  // ── flat tab rows (completed / overdue / delayed) ──
  const flatRows = useMemo(() => {
    const wanted = tab as string;
    let list = flat.filter(({ s, m }) =>
      m.status === wanted && matchSearch(s, m) && matchDept(s));
    list = [...list].sort((a, b) => {
      if (sort === 'due_asc' || sort === 'due_desc') {
        const da = a.m.due_date ? new Date(a.m.due_date).getTime() : Infinity;
        const db = b.m.due_date ? new Date(b.m.due_date).getTime() : Infinity;
        return sort === 'due_asc' ? da - db : db - da;
      }
      if (sort === 'name_asc')   return (a.m.name ?? '').localeCompare(b.m.name ?? '');
      if (sort === 'client_asc') return (a.s.consignee_name ?? '').localeCompare(b.s.consignee_name ?? '');
      return 0;
    });
    return list;
  }, [flat, tab, q, dept, sort]);

  // ── grouped tabs ──
  const grouped = useMemo(() => {
    if (tab !== 'by_client' && tab !== 'by_member') return [];
    const keyOf = (s: any) =>
      tab === 'by_client'
        ? (s.consignee_name || 'Unknown client')
        : memberBy === 'person'
          ? (s.created_by_name || 'Unassigned')
          : (s.sales_user_name || s.created_by_name || 'Unassigned');

    const map = new Map<string, any[]>();
    for (const r of rows) {
      const s = r.shipment;
      const mils = (r.milestones ?? []).filter((m: any) => matchSearch(s, m));
      if (!matchDept(s)) continue;
      if (q && mils.length === 0 && !matchSearch(s, null)) continue;
      const k = keyOf(s);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({ shipment: s, milestones: r.milestones ?? [] });
    }
    return [...map.entries()]
      .map(([name, ships]) => ({ name, ships }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, tab, memberBy, q, dept]);

  // ── tab meta ──
  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overdue',   label: 'Overdue',   count: counts.overdue },
    { key: 'delayed',   label: 'Delayed',   count: counts.delayed },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'by_client', label: 'By Client' },
    ...(canByMember ? [{ key: 'by_member' as Tab, label: 'By Member' }] : []),
  ];

  const isGrouped = tab === 'by_client' || tab === 'by_member';

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Inter', -apple-system, sans-serif", color: '#111827', padding: '32px 32px 80px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} table{border-collapse:collapse;width:100%}`}</style>

      {/* header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.015em', marginBottom: 6 }}>Current Milestones</h1>
        <p style={{ fontSize: 13, color: '#6B7280' }}>All milestones across shipments — grouped, filtered, and colour-coded by state.</p>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid #E5E7EB', flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px',
                background: 'none', border: 'none', borderBottom: `2px solid ${active ? '#2563EB' : 'transparent'}`,
                marginBottom: -1, fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? '#2563EB' : '#6B7280', cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {t.label}
              {t.count != null && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: active ? '#EFF6FF' : '#F3F4F6', color: active ? '#2563EB' : '#9CA3AF' }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', flex: 1, minWidth: 220, maxWidth: 340 }}>
          <SearchIcon />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shipments, milestones, people…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#374151', flex: 1, fontFamily: 'inherit' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 15 }}>×</button>}
        </div>

        {/* dept pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'AIR', 'SEA'] as const).map(d => {
            const active = dept === d;
            return (
              <button key={d} onClick={() => setDept(d)}
                style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${active ? '#BFDBFE' : '#E5E7EB'}`, background: active ? '#EFF6FF' : '#fff', color: active ? '#2563EB' : '#6B7280' }}>
                {d === 'all' ? 'All modes' : d === 'AIR' ? ' Air' : ' Sea'}
              </button>
            );
          })}
        </div>

        {/* sort */}
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, color: '#374151', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="due_asc">Due date — earliest</option>
          <option value="due_desc">Due date — latest</option>
          <option value="name_asc">Milestone name — A→Z</option>
          <option value="client_asc">Client — A→Z</option>
        </select>

        {/* member-by toggle (only on By Member tab) */}
        {tab === 'by_member' && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
            {(['person', 'sales'] as const).map(mb => {
              const active = memberBy === mb;
              return (
                <button key={mb} onClick={() => setMemberBy(mb)}
                  style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${active ? '#BBF7D0' : '#E5E7EB'}`, background: active ? '#F0FDF4' : '#fff', color: active ? '#15803D' : '#6B7280' }}>
                  {mb === 'person' ? 'Responsible person' : 'Sales / Ops user'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* body */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '60px 0' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#3B82F6', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>Loading milestones…</span>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#DC2626', fontSize: 13 }}>⚠ {error}</div>
      ) : isGrouped ? (
        <GroupedView groups={grouped} detailBase={detailBase} router={router} />
      ) : (
        <FlatTable list={flatRows} detailBase={detailBase} router={router} />
      )}

      {/* legend */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
          {[DARKRED, LIGHTRED, BLUE, YELLOW, NONE].map((t, i) => (
            <span key={i} style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot, display: 'inline-block' }} />
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── flat table (completed / overdue / delayed) ───────────────────────────────────
function FlatTable({ list, detailBase, router }: { list: any[]; detailBase?: string; router: any }) {
  const TH: React.CSSProperties = { padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
  if (list.length === 0)
    return <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '60px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No milestones in this state.</div>;
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Shipment', 'Client', 'Milestone', 'Status', 'Due date', 'Critical', ''].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map(({ s, m }) => {
              const t = toneFor(m);
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid #F3F4F6', borderLeft: `4px solid ${t.dot}` }}>
                  <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 4 }}>
                      {s.job_number ?? s.id.slice(0, 8)}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.consignee_name ?? '—'}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</td>
                  <td style={{ padding: '13px 16px' }}><StatusPill m={m} /></td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: m.status === 'overdue' ? '#DC2626' : '#6B7280', fontWeight: m.status === 'overdue' ? 600 : 400, whiteSpace: 'nowrap' }}>{fmtDate(m.due_date)}</td>
                  <td style={{ padding: '13px 16px' }}>{m.is_critical ? <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: 4 }}>Critical</span> : <span style={{ color: '#D1D5DB', fontSize: 12 }}>—</span>}</td>
                  <td style={{ padding: '13px 16px' }}>
                    {detailBase && (
                      <button onClick={() => router.push(`${detailBase}?id=${s.id}`)}
                        style={{ padding: '6px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#3B82F6', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        View
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── grouped nested view (By Client / By Member) ──────────────────────────────────
function GroupedView({ groups, detailBase, router }: { groups: any[]; detailBase?: string; router: any }) {
  if (groups.length === 0)
    return <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '60px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No shipments match.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map(g => <GroupSection key={g.name} group={g} detailBase={detailBase} router={router} />)}
    </div>
  );
}

function GroupSection({ group, detailBase, router }: { group: any; detailBase?: string; router: any }) {
  const [open, setOpen] = useState(true);
  const totalMs = group.ships.reduce((n: number, s: any) => n + (s.milestones?.length ?? 0), 0);
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', background: '#F9FAFB', border: 'none', borderBottom: open ? '1px solid #E5E7EB' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <Chevron open={open} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{group.name}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#EFF1F5', padding: '2px 8px', borderRadius: 99 }}>{group.ships.length} shipment{group.ships.length !== 1 ? 's' : ''}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#EFF1F5', padding: '2px 8px', borderRadius: 99 }}>{totalMs} milestone{totalMs !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {group.ships.map((s: any) => <ShipmentBlock key={s.shipment.id} entry={s} detailBase={detailBase} router={router} />)}
        </div>
      )}
    </div>
  );
}

function ShipmentBlock({ entry, detailBase, router }: { entry: any; detailBase?: string; router: any }) {
  const [open, setOpen] = useState(true);
  const s = entry.shipment;
  const mils = entry.milestones ?? [];
  return (
    <div style={{ border: '1px solid #EEF0F3', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#FCFCFD' }}>
        <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', padding: 0 }}><Chevron open={open} /></button>
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#3B82F6', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 4 }}>{s.job_number ?? s.id.slice(0, 8)}</span>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{s.consignee_name ?? '—'}</span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{s.transport_mode ?? ''}</span>
        {detailBase && (
          <button onClick={() => router.push(`${detailBase}?id=${s.id}`)}
            style={{ marginLeft: 'auto', padding: '4px 10px', background: '#fff', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#3B82F6', cursor: 'pointer', fontFamily: 'inherit' }}>
            View
          </button>
        )}
      </div>
      {open && (
        <div style={{ padding: '6px 10px 10px' }}>
          {mils.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 6px' }}>No milestones assigned.</div>
          ) : mils.map((m: any) => {
            const t = toneFor(m);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginTop: 4, background: t.bg, border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.dot}`, borderRadius: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                {m.is_critical && <span style={{ fontSize: 9, fontWeight: 800, color: '#B91C1C', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: 4 }}>CRITICAL</span>}
                <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{fmtDate(m.due_date)}</span>
                <StatusPill m={m} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
