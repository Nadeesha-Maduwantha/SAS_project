'use client';
import DataTable from '@/components/shared/DataTable';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Trash2, Bell, LayoutDashboard, ChevronDown,
  RefreshCw, Search, Package, Filter,
  CheckCircle2, Loader2, Ship, MapPin, FolderOpen,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';
const TRANSPORT_MODES = ['AIR', 'SEA', 'ROAD'];
const PICKUP_STATUSES = ['Future', 'Delayed', 'Overdue', 'Completed'];
const ALERT_STATUSES  = ['pending', 'overdue', 'completed', 'Get Action', 'Action Taken', 'Resolved'];
const PRIORITIES      = ['Critical', 'Non-Critical'];

const DEFAULT_TABS = [
  { id: 'shipments',  label: 'Shipments',  iconKey: 'ship',    isDefault: true },
  { id: 'alerts',     label: 'Alerts',     iconKey: 'bell',    isDefault: true },
  { id: 'milestones', label: 'Milestones', iconKey: 'map-pin', isDefault: true },
];

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TabIcon({ iconKey }) {
  const p = { size: 14, strokeWidth: 2 };
  if (iconKey === 'ship')    return <Ship     {...p} />;
  if (iconKey === 'bell')    return <Bell     {...p} />;
  if (iconKey === 'map-pin') return <MapPin   {...p} />;
  return <Package {...p} />;
}

function Badge({ label, color = 'gray' }) {
  const colors = {
    red:   { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
    amber: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    green: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    blue:  { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
    gray:  { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
  };
  const t = colors[color] || colors.gray;
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: t.bg, color: t.text, border: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function statusColor(s) {
  if (!s) return 'gray';
  const l = s.toLowerCase();
  if (l.includes('critical') || l.includes('overdue') || l.includes('delayed') || l === 'get action') return 'red';
  if (l.includes('pending')  || l.includes('future'))  return 'amber';
  if (l.includes('completed') || l === 'resolved')     return 'green';
  if (l === 'action taken')                             return 'blue';
  return 'gray';
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <FolderOpen size={22} color="#9CA3AF" />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No results found</p>
      <p style={{ fontSize: 13, color: '#9CA3AF' }}>{message}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
      <Loader2 size={18} color="#6B7280" style={{ animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 13, color: '#6B7280' }}>Loading...</span>
    </div>
  );
}

function TableToolbar({ search, onSearch, count, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 12px', width: 260 }}>
        <Search size={13} color="#9CA3AF" />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder={`Search ${label}...`}
          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%' }} />
      </div>
      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{count} {label}</span>
    </div>
  );
}

// ── Default tabs ──────────────────────────────────────────────────────────────
function ShipmentsDefaultTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => {
    fetch(`${API}/api/shipments`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setRows(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const filtered = rows.filter(r => !search || (r.job_number || '').toLowerCase().includes(search.toLowerCase()) || (r.consignee_name || '').toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <TableToolbar search={search} onSearch={setSearch} count={filtered.length} label="shipments" />
      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
              {['Job Number','Consignee','Mode','Branch','Pickup Status','Stage','Created'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7}><EmptyState message="No shipments match your search." /></td></tr>
              : filtered.map((r, i) => (
                <tr key={r.id} style={rowStyle(i)}>
                  <td style={{ ...TD, fontWeight: 600, fontFamily: 'monospace', color: '#1D4ED8' }}>#{r.job_number}</td>
                  <td style={TD}>{r.consignee_name || '—'}</td>
                  <td style={TD}><Badge label={r.transport_mode || '—'} color="blue" /></td>
                  <td style={{ ...TD, color: '#6B7280' }}>{r.branch || '—'}</td>
                  <td style={TD}><Badge label={r.pickup_date_status || '—'} color={statusColor(r.pickup_date_status)} /></td>
                  <td style={TD}><Badge label={r.llm_identified_type || r.current_stage || '—'} color="gray" /></td>
                  <td style={{ ...TD, color: '#9CA3AF', fontSize: 12 }}>{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AlertsDefaultTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => {
    fetch(`${API}/api/alerts`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setRows(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const filtered = rows.filter(r => !search || (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.assigned_to || '').toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <TableToolbar search={search} onSearch={setSearch} count={filtered.length} label="alerts" />
      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
              {['Milestone','Shipment ID','Status','Priority','Due Date','Assigned To','Notes'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7}><EmptyState message="No alerts found." /></td></tr>
              : filtered.map((r, i) => (
                <tr key={r.id || i} style={rowStyle(i)}>
                  <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{r.name || '—'}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12, color: '#6B7280' }}>{r.shipment_id?.slice(0,8)}…</td>
                  <td style={TD}><Badge label={r.status || '—'} color={statusColor(r.status)} /></td>
                  <td style={TD}>{r.is_critical ? <Badge label="Critical" color="red" /> : <Badge label="Normal" color="gray" />}</td>
                  <td style={{ ...TD, color: '#6B7280', fontSize: 12 }}>{fmtDate(r.due_date)}</td>
                  <td style={TD}>{r.assigned_to || <span style={{ color: '#D1D5DB' }}>Unassigned</span>}</td>
                  <td style={{ ...TD, color: '#6B7280', fontSize: 12, maxWidth: 180 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.notes || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

//default tables

function MilestonesDefaultTab() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusFilter, setStatusFilter] = useState('');   // '' = all
  const [critFilter,   setCritFilter]   = useState('');   // '' | 'true'

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status',      statusFilter);
    if (critFilter)   params.set('is_critical', critFilter);

    fetch(`${API}/api/milestones?${params.toString()}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, critFilter]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.name          || '').toLowerCase().includes(q) ||
      (r.job_number    || '').toLowerCase().includes(q) ||
      (r.consignee_name|| '').toLowerCase().includes(q) ||
      (r.assigned_to   || '').toLowerCase().includes(q)
    );
  });

  const STATUS_OPTIONS = [
    { value: '',          label: 'All Statuses' },
    { value: 'pending',   label: 'Pending'      },
    { value: 'current',   label: 'Current'      },
    { value: 'overdue',   label: 'Overdue'      },
    { value: 'completed', label: 'Completed'    },
  ];

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px', borderBottom: '1px solid #F3F4F6',
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F9FAFB', border: '1px solid #E5E7EB',
          borderRadius: 8, padding: '7px 12px', width: 260,
        }}>
          <Search size={13} color="#9CA3AF" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search milestones, shipments..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', fontFamily: 'inherit' }}
          />
        </div>

        {/* Status filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 28px 7px 10px', borderRadius: 8, fontSize: 12,
              border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
              cursor: 'pointer', fontFamily: 'inherit', appearance: 'none', outline: 'none',
            }}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={12} color="#9CA3AF" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Critical filter */}
        <button
          onClick={() => setCritFilter(p => p === 'true' ? '' : 'true')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background:   critFilter === 'true' ? '#FEE2E2' : '#F9FAFB',
            color:        critFilter === 'true' ? '#B91C1C' : '#6B7280',
            border:       critFilter === 'true' ? '1px solid #FECACA' : '1px solid #E5E7EB',
          }}
        >
          ⚠ Critical only
        </button>

        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
          {filtered.length} milestone{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      {loading ? (
        <Spinner />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                {['Milestone', 'Shipment', 'Client', 'Mode', 'Status', 'Critical', 'Due Date', 'Completed At', 'Assigned To', 'Notes'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState message="No milestones match your filters." />
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.id || i} style={rowStyle(i)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F0F7FF')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA')}
                  >
                    {/* Milestone name */}
                    <td style={{ ...TD, fontWeight: 600, color: '#111827', minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                          background: r.status === 'completed' ? '#D1FAE5'
                            : r.status === 'overdue'   ? '#FEE2E2'
                            : r.status === 'current'   ? '#DBEAFE'
                            : '#F3F4F6',
                          color: r.status === 'completed' ? '#065F46'
                            : r.status === 'overdue'   ? '#B91C1C'
                            : r.status === 'current'   ? '#1D4ED8'
                            : '#6B7280',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800,
                        }}>
                          {(r.sequence_order ?? 0) + 1}
                        </span>
                        {r.name || '—'}
                      </div>
                    </td>

                    {/* Shipment job number */}
                    <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12, color: '#1D4ED8', fontWeight: 700 }}>
                      {r.job_number ? `#${r.job_number}` : '—'}
                    </td>

                    {/* Consignee */}
                    <td style={{ ...TD, color: '#374151', maxWidth: 160 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {r.consignee_name || '—'}
                      </span>
                    </td>

                    {/* Transport mode */}
                    <td style={TD}>
                      {r.transport_mode
                        ? <Badge label={r.transport_mode} color="blue" />
                        : <span style={{ color: '#D1D5DB' }}>—</span>}
                    </td>

                    {/* Status */}
                    <td style={TD}>
                      <Badge label={r.status || '—'} color={statusColor(r.status)} />
                    </td>

                    {/* Critical */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {r.is_critical
                        ? <Badge label="⚠ Critical" color="red" />
                        : <span style={{ color: '#D1D5DB', fontSize: 12 }}>—</span>}
                    </td>

                    {/* Due date */}
                    <td style={{ ...TD, color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {fmtDate(r.due_date)}
                    </td>

                    {/* Completed at */}
                    <td style={{ ...TD, color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {fmtDate(r.completed_date)}
                    </td>

                    {/* Assigned to */}
                    <td style={{ ...TD, color: '#374151', fontSize: 12 }}>
                      {r.assigned_to || <span style={{ color: '#D1D5DB' }}>Unassigned</span>}
                    </td>

                    {/* Notes */}
                    <td style={{ ...TD, color: '#6B7280', fontSize: 12, maxWidth: 200 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {r.notes || <span style={{ color: '#D1D5DB' }}>—</span>}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Custom table view ─────────────────────────────────────────────────────────
export function CustomTableView({ tableConfig, onSendAlert, onDelete }) {
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState([]);
  const [alertSent, setAlertSent] = useState(false);
  const [pinned,   setPinned]   = useState(tableConfig.pinned_to_dashboard || false);
  const [pinning,  setPinning]  = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`${API}/api/custom-tables/${tableConfig.id}/data`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setRows(d.data || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tableConfig.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isShipments = tableConfig.data_source === 'shipments';
  const filtered = rows.filter(r => {
    if (!search) return true;
    const h = isShipments ? `${r.job_number} ${r.consignee_name}` : `${r.name} ${r.assigned_to}`;
    return h.toLowerCase().includes(search.toLowerCase());
  });

  const handleSendAlert = () => {
    onSendAlert({ tableConfig, selectedRows: rows.filter(r => selected.includes(r.id)) });
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 3000);
  };

  const handlePinToggle = async () => {
    setPinning(true);
    try {
      const res = await fetch(`${API}/api/custom-tables/${tableConfig.id}/pin`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ pinned: !pinned }),
      });
      if (res.ok) setPinned(p => !p);
    } catch {} finally { setPinning(false); }
  };

  const activeFilters = Object.entries(tableConfig.filters || {}).filter(([, v]) => v);

  return (
    <div>
      {/* Filter pills */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={11} /> Filters:
          </span>
          {activeFilters.map(([k, v]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
              <span style={{ color: '#93C5FD', fontSize: 10 }}>{k.replace(/_/g, ' ')}</span>{v}
            </span>
          ))}
        </div>
      )}

      {/* Action toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid #F3F4F6', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button
          onClick={handleSendAlert} disabled={selected.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
            background: alertSent ? '#D1FAE5' : selected.length === 0 ? '#F9FAFB' : '#DC2626',
            color:  alertSent ? '#065F46' : selected.length === 0 ? '#D1D5DB' : '#fff',
            border: alertSent ? '1px solid #A7F3D0' : selected.length === 0 ? '1px solid #E5E7EB' : '1px solid #DC2626',
            transition: 'all 0.2s',
          }}
        >
          {alertSent ? <CheckCircle2 size={14} /> : <Bell size={14} />}
          {alertSent ? 'Alert Sent!' : selected.length > 0 ? `Send Alert (${selected.length})` : 'Send Alert'}
        </button>

        <button
          onClick={handlePinToggle} disabled={pinning}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            cursor: pinning ? 'not-allowed' : 'pointer',
            background: pinned ? '#EFF6FF' : '#F9FAFB',
            color:  pinned ? '#1D4ED8' : '#6B7280',
            border: pinned ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
            transition: 'all 0.2s',
          }}
          title={pinned ? 'Remove from dashboard' : 'Pin to dashboard'}
        >
          <LayoutDashboard size={13} />
          {pinning ? 'Saving...' : pinned ? 'Pinned' : 'Dashboard'}
        </button>

        <button onClick={() => onDelete(tableConfig.id)} style={{ ...iconBtn, color: '#EF4444', borderColor: '#FECACA' }} title="Delete this table">
          <Trash2 size={13} />
        </button>
      </div>

      {/* DataTable handles the rest */}
      <DataTable
        data={filtered}
        dataSource={tableConfig.data_source}
        loading={loading}
        error={error}
        search={search}
        onSearch={setSearch}
        onRefresh={fetchData}
        selectedIds={selected}
        onSelectChange={setSelected}
      />
    </div>
  );
}

// ── Form helpers ──────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} color="#9CA3AF" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

// ── Create drawer ─────────────────────────────────────────────────────────────
function CreateTableDrawer({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [dataSource, setDataSource] = useState('shipments');
  const [filters, setFilters] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value || undefined }));

  const handleCreate = async () => {
    if (!name.trim()) { setError('Table name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/api/custom-tables`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ name: name.trim(), data_source: dataSource, filters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create table');
      onCreate(data.data);
      setName(''); setFilters({}); setDataSource('shipments'); onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.25s' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)', zIndex: 50, overflowY: 'auto', transform: isOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Create Custom Table</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>Save a filtered view for instant access</p>
          </div>
          <button onClick={onClose} style={{ ...iconBtn, width: 32, height: 32 }}><X size={15} /></button>
        </div>
        <div style={{ padding: '24px' }}>
          <Field label="Table Name *">
            <input value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder='e.g. "ABC Company Shipments"' style={{ ...inputStyle, borderColor: error && !name ? '#FCA5A5' : '#E5E7EB' }} />
            {error && !name && <span style={{ fontSize: 11, color: '#DC2626', marginTop: 4, display: 'block' }}>{error}</span>}
          </Field>

          <Field label="Data Source">
            <div style={{ display: 'flex', gap: 8 }}>
              {['shipments', 'alerts'].map(src => (
                <button key={src} onClick={() => { setDataSource(src); setFilters({}); }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: dataSource === src ? '#1D4ED8' : '#F9FAFB', color: dataSource === src ? '#fff' : '#374151', border: dataSource === src ? '1px solid #1D4ED8' : '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {src === 'shipments' ? <Ship size={14} /> : <Bell size={14} />}
                  {src === 'shipments' ? 'Shipments' : 'Alerts'}
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}><Filter size={10} /> Filters</span>
            <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
          </div>

          <Field label="Company / Consignee Name">
            <input value={filters.consignee_name || ''} onChange={e => setFilter('consignee_name', e.target.value)} placeholder='e.g. "ABC Exports"' style={inputStyle} />
          </Field>
          <Field label="Transport Mode">
            <SelectField value={filters.transport_mode || ''} onChange={v => setFilter('transport_mode', v)} options={[{ value: '', label: 'All modes' }, ...TRANSPORT_MODES.map(m => ({ value: m, label: m }))]} />
          </Field>

          {dataSource === 'shipments' && (
            <>
              <Field label="Pickup Status">
                <SelectField value={filters.pickup_status || ''} onChange={v => setFilter('pickup_status', v)} options={[{ value: '', label: 'Any status' }, ...PICKUP_STATUSES.map(s => ({ value: s, label: s }))]} />
              </Field>
              <Field label="Branch">
                <input value={filters.branch || ''} onChange={e => setFilter('branch', e.target.value)} placeholder='e.g. "CMB"' style={inputStyle} />
              </Field>
            </>
          )}
          {dataSource === 'alerts' && (
            <>
              <Field label="Alert Priority">
                <SelectField value={filters.priority || ''} onChange={v => setFilter('priority', v)} options={[{ value: '', label: 'All priorities' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]} />
              </Field>
              <Field label="Alert Status">
                <SelectField value={filters.alert_status || ''} onChange={v => setFilter('alert_status', v)} options={[{ value: '', label: 'Any status' }, ...ALERT_STATUSES.map(s => ({ value: s, label: s }))]} />
              </Field>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 8, marginTop: 8 }}>
            <LayoutDashboard size={15} color="#3B82F6" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', margin: 0 }}>Pin to Dashboard</p>
              <p style={{ fontSize: 11, color: '#93C5FD', margin: '2px 0 0' }}>After creating, use the Dashboard button to pin it as a stat card.</p>
            </div>
          </div>

          {error && name && <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#DC2626' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, background: saving ? '#93C5FD' : '#1D4ED8', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background 0.15s' }}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : '✦ Create Table'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomTablesPage() {
  const [activeTab,      setActiveTab]      = useState('shipments');
  const [customTables,   setCustomTables]   = useState([]);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [loadingTables,  setLoadingTables]  = useState(true);
  const [alertModalData, setAlertModalData] = useState(null);

  const fetchTables = useCallback(() => {
    setLoadingTables(true);
    fetch(`${API}/api/custom-tables`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setCustomTables(d.data || [])).catch(() => {}).finally(() => setLoadingTables(false));
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleCreate = (t) => { setCustomTables(p => [...p, t]); setActiveTab(t.id); };
  const handleDelete = async (id) => {
    if (!confirm('Delete this custom table? This cannot be undone.')) return;
    try {
      await fetch(`${API}/api/custom-tables/${id}`, { method: 'DELETE', headers: authHeaders() });
      setCustomTables(p => p.filter(t => t.id !== id));
      if (activeTab === id) setActiveTab('shipments');
    } catch { alert('Failed to delete table.'); }
  };

  const allTabs = [
    ...DEFAULT_TABS,
    ...customTables.map(t => ({ id: t.id, label: t.name, iconKey: t.data_source === 'shipments' ? 'ship' : 'bell', isDefault: false, config: t })),
  ];
  const activeConfig = customTables.find(t => t.id === activeTab);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }`}</style>
      <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Custom Tables</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Create focused views of your shipment and alert data. Each table is saved to your account.</p>
            </div>
            <button onClick={() => setDrawerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: '#111827', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#1D4ED8')} onMouseLeave={e => (e.currentTarget.style.background = '#111827')}>
              <Plus size={14} /> New Table
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, overflowX: 'auto' }}>
            {allTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px 10px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', background: isActive ? '#fff' : 'transparent', color: isActive ? '#111827' : '#6B7280', border: isActive ? '1px solid #E5E7EB' : '1px solid transparent', borderBottom: isActive ? '1px solid #fff' : '1px solid transparent', marginBottom: isActive ? -1 : 0, position: 'relative', zIndex: isActive ? 2 : 1, transition: 'all 0.15s' }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                  <TabIcon iconKey={tab.iconKey} />
                  {tab.label}
                  {!tab.isDefault && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', marginLeft: 2, flexShrink: 0 }} />}
                </button>
              );
            })}
            <button onClick={() => setDrawerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px 10px', borderRadius: '8px 8px 0 0', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#9CA3AF', border: '1px dashed #D1D5DB', borderBottom: '1px dashed transparent', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.borderColor = '#93C5FD'; }} onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>
              <Plus size={12} /> New
            </button>
          </div>
        </div>

        <div style={{ margin: '0 28px 28px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0 8px 8px 8px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', animation: 'fadeIn 0.2s ease', overflow: 'hidden' }}>
          {activeTab === 'shipments'  && <ShipmentsDefaultTab />}
          {activeTab === 'alerts'     && <AlertsDefaultTab />}
          {activeTab === 'milestones' && <MilestonesDefaultTab />}
          {activeConfig && <CustomTableView key={activeConfig.id} tableConfig={activeConfig} onSendAlert={setAlertModalData} onDelete={handleDelete} />}
          {!['shipments','alerts','milestones'].includes(activeTab) && !activeConfig && <EmptyState message="This table could not be loaded." />}
        </div>

        {alertModalData && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#D1FAE5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Bell size={22} color="#065F46" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', color: '#111827', marginBottom: 8 }}>Alert Queued</h3>
              <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
                Alert will be sent for <strong>{alertModalData.selectedRows.length}</strong> row(s) from <strong>"{alertModalData.tableConfig.name}"</strong>.
                <br /><span style={{ fontSize: 12, color: '#9CA3AF' }}>Email integration connects in the next sprint.</span>
              </p>
              <button onClick={() => setAlertModalData(null)} style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: '#111827', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Got it</button>
            </div>
          </div>
        )}
      </div>
      <CreateTableDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onCreate={handleCreate} />
    </>
  );
}

const TH = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' };
const TD = { padding: '12px 16px', verticalAlign: 'middle', fontSize: 13, color: '#374151' };
const rowStyle = i => ({ borderBottom: '1px solid #F9FAFB', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.1s' });
const iconBtn = { width: 32, height: 32, borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', cursor: 'pointer', transition: 'all 0.15s', padding: 0 };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };