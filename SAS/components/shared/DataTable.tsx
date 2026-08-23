'use client';

// =============================================================
//  DataTable.tsx  —  components/shared/DataTable.tsx
//
//  FIX: ShipmentTableRow now uses proper <tr><td> structure
//       throughout — no <tr> inside <div>, no hydration error.
//  FIX: Column headers align with rows via shared 7-col grid.
//  CHANGE: "Pickup Status" removed; "Stage" → "Current Stage".
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { Mail, Search, RefreshCw, ChevronRight, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import EmailComposeModal from '@/components/EmailComposeModal';
import { AlertData } from '@/components/AlertDetailsModal';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ShipmentRow {
  id:                  string;
  job_number:          string;
  consignee_name:      string;
  transport_mode:      string;
  branch:              string;
  pickup_date_status:  string;
  llm_identified_type: string;
  current_stage:       string;
  created_at:          string;
}

export interface AlertRow {
  id:             string;
  shipment_id:    string;
  name:           string;
  status:         string;
  is_critical:    boolean;
  due_date:       string | null;
  completed_date: string | null;
  notes:          string | null;
  assigned_to:    string | null;
  assigned_email: string | null;
  alert_sent:     boolean;
  created_at:     string;
}

interface MilestoneRow {
  id:             string;
  name:           string;
  status:         string;
  is_critical:    boolean;
  due_date:       string | null;
  completed_date: string | null;
  sequence_order: number;
}

export interface DataTableProps {
  data:            (ShipmentRow | AlertRow)[];
  dataSource:      'shipments' | 'alerts';
  loading?:        boolean;
  error?:          string | null;
  search?:         string;
  onSearch?:       (s: string) => void;
  onRefresh?:      () => void;
  selectedIds?:    string[];
  onSelectChange?: (ids: string[]) => void;
}

// ── Status badge ───────────────────────────────────────────────────────────────
function statusTokens(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('delayed') || s.includes('overdue') || s === 'get action' || s.includes('critical'))
    return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
  if (s.includes('future') || s.includes('pending') || s === 'action taken')
    return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
  if (s.includes('completed') || s === 'resolved' || s.includes('delivered'))
    return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' };
  if (s === 'air' || s === 'sea' || s === 'road')
    return { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' };
  return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
}

function StatusBadge({ label }: { label: string }) {
  const t = statusTokens(label);
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 600,
      padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap',
      background: t.bg, color: t.text, border: `1px solid ${t.border}`,
    }}>{label || '—'}</span>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────────
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [vis, setVis] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVis(true)} onMouseLeave={() => setVis(false)}>
      {children}
      {vis && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)', background: '#1F2937', color: '#fff',
          fontSize: 11, fontWeight: 500, padding: '6px 10px', borderRadius: 6,
          whiteSpace: 'nowrap', zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,.15)',
        }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '4px solid transparent', borderTopColor: '#1F2937' }} />
        </span>
      )}
    </span>
  );
}

// ── Milestone list (lazy fetch on expand) ─────────────────────────────────────
function MilestoneList({ shipmentId }: { shipmentId: string }) {
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [loading,    setLoading]    = useState(true);

  // useEffect — not useState — for side effects
  useEffect(() => {
    fetch(`${API}/api/shipments/${shipmentId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setMilestones(
        (d.data?.milestones || []).sort((a: MilestoneRow, b: MilestoneRow) => a.sequence_order - b.sequence_order)
      ))
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, [shipmentId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#6B7280', animation: 'dtSpin 0.7s linear infinite' }} />
      <span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading milestones...</span>
    </div>
  );

  if (!milestones.length) return <p style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>No milestones assigned.</p>;

  const active    = milestones.filter(m => m.status !== 'completed');
  const completed = milestones.filter(m => m.status === 'completed');

  const renderMs = (m: MilestoneRow) => (
    <div key={m.id} style={{
      display: 'grid', gridTemplateColumns: '14px 1fr 110px 110px 100px',
      alignItems: 'center', padding: '8px 0',
      borderBottom: '1px solid #F9FAFB',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.is_critical ? '#EF4444' : m.status === 'completed' ? '#10B981' : '#F59E0B', display: 'inline-block' }} />
      <span style={{ fontSize: 12, fontWeight: m.is_critical ? 600 : 400, color: '#374151', paddingLeft: 6 }}>
        {m.name}
        {m.is_critical && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#FEE2E2', color: '#B91C1C' }}>CRITICAL</span>}
      </span>
      <StatusBadge label={m.status} />
      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(m.due_date)}</span>
      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(m.completed_date)}</span>
    </div>
  );

  return (
    <div>
      {/* Sub-header */}
      <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr 110px 110px 100px', padding: '4px 0 8px', borderBottom: '1px solid #E5E7EB', marginBottom: 4 }}>
        {['', 'Milestone', 'Status', 'Due', 'Completed'].map((h, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: i === 1 ? 6 : 0 }}>{h}</span>
        ))}
      </div>
      {active.map(renderMs)}
      {completed.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 0 6px', borderTop: '1px solid #F3F4F6', marginTop: 4 }}>
            <CheckCircle2 size={12} color="#10B981" />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completed</span>
          </div>
          {completed.map(renderMs)}
        </>
      )}
    </div>
  );
}

// ── Shipment row — proper <tr><td> throughout, no <tr> inside <div> ────────────
function ShipmentTableRow({
  row, index, selected, onSelect, onEmailClick,
}: {
  row:          ShipmentRow;
  index:        number;
  selected:     boolean;
  onSelect:     () => void;
  onEmailClick: (d: AlertData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded(e => !e);

  const bg = selected ? '#EFF6FF' : index % 2 === 0 ? '#fff' : '#FAFAFA';

  return (
    <>
      {/* ── Main row — 7 proper <td> cells, aligns with 7 <th> header cells ── */}
      <tr style={{ background: bg, borderBottom: expanded ? '1px solid #EFF6FF' : '1px solid #F3F4F6', transition: 'background 0.1s' }}>

        {/* Checkbox */}
        <td style={{ ...TD, width: 44, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={onSelect}
            style={{ width: 14, height: 14, cursor: 'pointer' }} onClick={e => e.stopPropagation()} />
        </td>

        {/* Job number — chevron lives here */}
        <td style={{ ...TD, whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={toggle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              display: 'inline-flex', flexShrink: 0,
              transition: 'transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1)',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              color: '#9CA3AF',
            }}>
              <ChevronRight size={13} />
            </span>
            <Tooltip text={`Shipment: ${row.job_number}`}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1D4ED8', cursor: 'help' }}>
                #{row.job_number}
              </span>
            </Tooltip>
          </div>
        </td>

        {/* Consignee */}
        <td style={{ ...TD, cursor: 'pointer' }} onClick={toggle}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{row.consignee_name || '—'}</span>
        </td>

        {/* Mode */}
        <td style={{ ...TD, cursor: 'pointer' }} onClick={toggle}>
          <StatusBadge label={row.transport_mode || '—'} />
        </td>

        {/* Branch */}
        <td style={{ ...TD, fontSize: 12, color: '#6B7280', cursor: 'pointer' }} onClick={toggle}>
          {row.branch || '—'}
        </td>

        {/* Current Stage (replaces Pickup Status + Stage) */}
        <td style={{ ...TD, fontSize: 12, color: '#374151', cursor: 'pointer' }} onClick={toggle}>
          {row.llm_identified_type || row.current_stage || '—'}
        </td>

        {/* Created */}
        <td style={{ ...TD, fontSize: 11, color: '#9CA3AF', cursor: 'pointer' }} onClick={toggle}>
          {fmtDate(row.created_at)}
        </td>
      </tr>

      {/* ── Expanded panel — a single <tr> below the main row ── */}
      {expanded && (
        <tr style={{ background: '#fff' }}>
          {/*
            colSpan=7 spans all columns.
            The card is a <div> inside <td> — valid HTML, no hydration error.
          */}
          <td colSpan={7} style={{ padding: '0 16px 14px', border: 'none', background: '#F9FAFB' }}>
            <div style={{
              background: '#fff', borderRadius: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.09)',
              border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden',
              animation: 'dtPanelOpen 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}>
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                  Milestone Progress — #{row.job_number}
                </span>
                <button
                  onClick={() => onEmailClick({
                    id:            row.job_number,
                    shipment_id:   row.id,
                    client:        row.consignee_name,
                    priority:      (row.pickup_date_status || '').toLowerCase().includes('delayed') ? 'Medium' : 'Low',
                    milestone:     null,
                    milestoneIcon: null,
                    issue:         `Shipment ${row.job_number} requires attention.`,
                    delay:         (row.pickup_date_status || '').toLowerCase().includes('delayed') ? 'Delayed' : null,
                    delayColor:    '#D97706',
                    status:        'Get Action',
                  })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
                    padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <Mail size={11} /> Send Alert
                </button>
              </div>

              {/* Milestones */}
              <div style={{ padding: '14px 18px' }}>
                <MilestoneList shipmentId={row.id} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Alert row ─────────────────────────────────────────────────────────────────
function AlertTableRow({
  row, index, selected, onSelect, onEmailClick, dimmed,
}: {
  row:          AlertRow;
  index:        number;
  selected:     boolean;
  onSelect:     () => void;
  onEmailClick: (d: AlertData) => void;
  dimmed?:      boolean;
}) {
  return (
    <tr style={{
      borderBottom: '1px solid #F3F4F6',
      background:   selected ? '#EFF6FF' : index % 2 === 0 ? '#fff' : '#FAFAFA',
      opacity:      dimmed ? 0.6 : 1,
      transition:   'background 0.1s',
    }}>
      <td style={{ ...TD, width: 44, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onSelect} style={{ width: 14, height: 14, cursor: 'pointer' }} />
      </td>
      <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>
        <Tooltip text={`Milestone: ${row.name}`}>
          <span style={{ cursor: 'help' }}>{row.name || '—'}</span>
        </Tooltip>
      </td>
      <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>
        {row.shipment_id?.slice(0, 8)}…
      </td>
      <td style={TD}><StatusBadge label={row.status || '—'} /></td>
      <td style={TD}>
        {row.is_critical
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>
              <AlertTriangle size={11} /> Critical
            </span>
          : <span style={{ fontSize: 11, color: '#D1D5DB' }}>Normal</span>}
      </td>
      <td style={{ ...TD, fontSize: 12, color: '#6B7280' }}>{fmtDate(row.due_date)}</td>
      <td style={TD}>{row.assigned_to || <span style={{ color: '#D1D5DB', fontSize: 12 }}>—</span>}</td>
      <td style={{ ...TD, fontSize: 12, color: '#6B7280', maxWidth: 180 }}>
        <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
          {row.notes || '—'}
        </span>
      </td>
      <td style={{ ...TD, textAlign: 'right' }}>
        <button
          onClick={() => onEmailClick({
            id:            row.shipment_id?.slice(0, 8) || '—',
            shipment_id:   row.shipment_id,
            client:        row.assigned_to || 'Unknown',
            priority:      row.is_critical ? 'Critical' : 'Low',
            milestone:     row.name,
            milestoneIcon: null,
            issue:         row.notes || `"${row.name}" requires attention.`,
            delay:         null,
            delayColor:    '#D97706',
            status:        'Get Action',
            dueDate:       row.due_date,
            alertStatus:   row.status,
            isCritical:    row.is_critical,
          })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <Mail size={11} /> Alert
        </button>
      </td>
    </tr>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────
function SectionDivider({ label, count, colSpan }: { label: string; count: number; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0, border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#F9FAFB', borderTop: '2px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
          <CheckCircle2 size={14} color="#10B981" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 99, background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' }}>{count}</span>
        </div>
      </td>
    </tr>
  );
}

// ── Main DataTable ─────────────────────────────────────────────────────────────
export default function DataTable({
  data, dataSource, loading = false, error = null,
  search = '', onSearch, onRefresh,
  selectedIds = [], onSelectChange,
}: DataTableProps) {
  const [emailData, setEmailData] = useState<AlertData | null>(null);

  const toggleSelect = (id: string) => {
    if (!onSelectChange) return;
    onSelectChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const toggleAll = (rows: (ShipmentRow | AlertRow)[]) => {
    if (!onSelectChange) return;
    const ids = rows.map(r => r.id);
    onSelectChange(selectedIds.length === ids.length ? [] : ids);
  };

  // ── Split active vs completed ──────────────────────────────────────────────
  const { active, completed } = (() => {
    if (dataSource === 'shipments') {
      const a = (data as ShipmentRow[]).filter(r => !(r.llm_identified_type || '').toLowerCase().includes('delivered'));
      const c = (data as ShipmentRow[]).filter(r =>  (r.llm_identified_type || '').toLowerCase().includes('delivered'));
      return { active: a, completed: c };
    }
    const done = ['completed', 'resolved'];
    const a = (data as AlertRow[]).filter(r => !done.includes((r.status || '').toLowerCase()));
    const c = (data as AlertRow[]).filter(r =>  done.includes((r.status || '').toLowerCase()));
    return { active: a, completed: c };
  })();

  const allRows = [...active, ...completed];

  // ── Column headers ─────────────────────────────────────────────────────────
  // Shipments: 7 cols  |  Alerts: 9 cols
  const shipHeaders = ['Job Number', 'Consignee', 'Mode', 'Branch', 'Current Stage', 'Created'];
  const alrtHeaders = ['Milestone', 'Shipment', 'Status', 'Priority', 'Due Date', 'Assigned', 'Notes', ''];

  const colCount = dataSource === 'shipments' ? 7 : 9; // +1 for checkbox col

  return (
    <>
      <style>{`
        @keyframes dtSpin     { to { transform: rotate(360deg) } }
        @keyframes dtPanelOpen { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 12px', flex: 1, maxWidth: 280 }}>
          <Search size={13} color="#9CA3AF" />
          <input
            value={search} onChange={e => onSearch?.(e.target.value)}
            placeholder={`Search ${dataSource}...`}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: '#374151' }}
          />
        </div>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
          {active.length} active{completed.length > 0 ? `, ${completed.length} completed` : ''}
        </span>
        {onRefresh && (
          <button onClick={onRefresh}
            style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#6B7280', animation: 'dtSpin 0.7s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>Loading...</span>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#DC2626', fontSize: 13 }}>⚠ {error}</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Package size={32} color="#D1D5DB" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>No results</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No {dataSource} match the saved filters.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                {/* Checkbox header */}
                <th style={{ ...TH, width: 44, textAlign: 'center' }}>
                  <input type="checkbox"
                    checked={selectedIds.length === allRows.length && allRows.length > 0}
                    onChange={() => toggleAll(allRows)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}
                  />
                </th>
                {/* Data column headers */}
                {(dataSource === 'shipments' ? shipHeaders : alrtHeaders).map((h, i) => (
                  <th key={i} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataSource === 'shipments' ? (
                <>
                  {(active as ShipmentRow[]).map((row, i) => (
                    <ShipmentTableRow
                      key={row.id} row={row} index={i}
                      selected={selectedIds.includes(row.id)}
                      onSelect={() => toggleSelect(row.id)}
                      onEmailClick={setEmailData}
                    />
                  ))}
                  {completed.length > 0 && (
                    <>
                      <SectionDivider label="Delivered / Completed" count={completed.length} colSpan={colCount} />
                      {(completed as ShipmentRow[]).map((row, i) => (
                        <ShipmentTableRow
                          key={row.id} row={row} index={i}
                          selected={selectedIds.includes(row.id)}
                          onSelect={() => toggleSelect(row.id)}
                          onEmailClick={setEmailData}
                        />
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {(active as AlertRow[]).map((row, i) => (
                    <AlertTableRow key={row.id || i} row={row} index={i}
                      selected={selectedIds.includes(row.id)} onSelect={() => toggleSelect(row.id)}
                      onEmailClick={setEmailData} />
                  ))}
                  {completed.length > 0 && (
                    <>
                      <SectionDivider label="Resolved / Completed" count={completed.length} colSpan={colCount} />
                      {(completed as AlertRow[]).map((row, i) => (
                        <AlertTableRow key={row.id || i} row={row} index={i}
                          selected={selectedIds.includes(row.id)} onSelect={() => toggleSelect(row.id)}
                          onEmailClick={setEmailData} dimmed />
                      ))}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      <EmailComposeModal isOpen={Boolean(emailData)} onClose={() => setEmailData(null)} alertData={emailData} />
    </>
  );
}

const TH: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: '11px 14px', verticalAlign: 'middle', fontSize: 13, color: '#374151',
};