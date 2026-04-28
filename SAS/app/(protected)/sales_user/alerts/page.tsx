'use client';

import { useState, useEffect } from 'react';
import {
    AlertCircle, Clock, CheckCircle2, Download, Search, Eye, Mail,
    MoreHorizontal, Anchor, Truck, Warehouse, Plane, Navigation,
    LayoutList, LayoutGrid, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AlertDetailsModal, { AlertData } from '@/components/AlertDetailsModal';
import EmailComposeModal from '@/components/EmailComposeModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type Alert = {
    id: string;
    shipment_id: string;
    client: string;
    clientInitial: string;
    clientColor: string;
    priority: 'Critical' | 'Medium' | 'Low';
    milestone: string;
    milestoneIcon: 'anchor' | 'truck' | 'warehouse' | 'plane' | 'navigation';
    issue: string;
    delay: string;
    delayColor: string;
    status: 'Get Action' | 'Action Taken' | 'Resolved';
    createdAt: Date;
}

type SupabaseRow = {
    shipment_id: string;
    name: string;
    status: string;
    notes: string;
    is_critical: boolean;
    due_date: string | null;
    completed_date: string | null;
    assigned_to: string;
    assigned_email: string;
    alert_sent: boolean;
    created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CLIENT_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];

function getMilestoneIcon(name: string = ''): 'anchor' | 'truck' | 'warehouse' | 'plane' | 'navigation' {
    const n = name.toLowerCase();
    if (n.includes('port') || n.includes('arrival') || n.includes('anchor')) return 'anchor';
    if (n.includes('transit') || n.includes('truck') || n.includes('road')) return 'truck';
    if (n.includes('warehouse') || n.includes('storage')) return 'warehouse';
    if (n.includes('departure') || n.includes('flight') || n.includes('air')) return 'plane';
    return 'navigation';
}

function mapRow(row: SupabaseRow, idx: number): Alert {
    const initial = String(row.shipment_id || '?')[0].toUpperCase();
    const isOverdue = row.due_date && !row.completed_date && new Date(row.due_date) < new Date();
    return {
        id: `${row.shipment_id}-${idx}`,
        shipment_id: row.shipment_id,
        client: String(row.shipment_id),
        clientInitial: initial,
        clientColor: CLIENT_COLORS[idx % CLIENT_COLORS.length],
        priority: row.is_critical ? 'Critical' : 'Medium',
        milestone: row.name || '—',
        milestoneIcon: getMilestoneIcon(row.name),
        issue: row.notes || '—',
        delay: isOverdue ? `Overdue since ${new Date(row.due_date!).toLocaleDateString()}` : '—',
        delayColor: isOverdue ? '#ef4444' : '#6b7280',
        status: 'Get Action',
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    };
}

// Convert internal Alert → AlertData for modals
function toAlertData(alert: Alert): AlertData {
    return {
        id: alert.id,
        shipment_id: alert.shipment_id,
        client: alert.client,
        clientInitial: alert.clientInitial,
        clientColor: alert.clientColor,
        priority: alert.priority,
        milestone: alert.milestone,
        milestoneIcon: alert.milestoneIcon,
        issue: alert.issue,
        delay: alert.delay,
        delayColor: alert.delayColor,
        status: alert.status,
        createdAt: alert.createdAt,
    };
}

// ─── Small components ─────────────────────────────────────────────────────────
function PriorityBadge({ level }: { level: string }) {
    const map: Record<string, { bg: string; color: string; dot: string }> = {
        Critical: { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
        High:     { bg: '#fff7ed', color: '#ea580c', dot: '#f97316' },
        Medium:   { bg: '#fefce8', color: '#ca8a04', dot: '#eab308' },
        Low:      { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
    };
    const s = map[level] || map.Medium;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: s.bg, color: s.color, fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            {level}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string; border: string }> = {
        'Get Action':   { bg: '#fff0f0', color: '#dc2626', border: '#fca5a5' },
        'Action Taken': { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
        'Resolved':     { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
        pending:        { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
    };
    const s = map[status] || map['Get Action'];
    return (
        <span style={{ display: 'inline-block', background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
            {status}
        </span>
    );
}

function MilestoneIcon({ type }: { type: string }) {
    const props = { size: 14, color: '#6b7280' };
    const map: Record<string, React.ReactNode> = {
        anchor: <Anchor {...props} />, truck: <Truck {...props} />,
        warehouse: <Warehouse {...props} />, plane: <Plane {...props} />,
        navigation: <Navigation {...props} />,
    };
    return <>{map[type] || null}</>;
}

function ClientAvatar({ initial, color, name }: { initial: string; color: string; name: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>
                {initial}
            </div>
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{name}</span>
        </div>
    );
}

function ActionBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} title={title} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4f8ef7'; e.currentTarget.style.color = '#4f8ef7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
        >
            {icon}
        </button>
    );
}

function PageBtn({ label, icon, right = false }: { label: string; icon: React.ReactNode; right?: boolean }) {
    return (
        <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: 500, flexDirection: right ? 'row-reverse' : 'row' }}>
            {icon}{label}
        </button>
    );
}

const thStyle: React.CSSProperties = { padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle' };

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AlertDashboardPage() {
    const [viewMode, setViewMode] = useState<string>('table');
    const [priorityFilter, setPriorityFilter] = useState<string>('All Priorities');
    const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
    const [search, setSearch] = useState<string>('');
    const [selected, setSelected] = useState<string[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // ── Modal state ──────────────────────────────────────────────
    const [detailsOpen, setDetailsOpen]   = useState(false);
    const [composeOpen, setComposeOpen]   = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);

    const openDetails = (alert: Alert) => {
        setSelectedAlert(toAlertData(alert));
        setDetailsOpen(true);
    };

    const openCompose = (data: AlertData) => {
        setSelectedAlert(data);
        setDetailsOpen(false);
        setComposeOpen(true);
    };

    const updateAlertStatus = async (alertId: string, newStatus: string) => {
        const shipmentId = alertId.split('-').slice(0, -1).join('-');
        
        const { error } = await supabase
            .from('shipment_milestones')
            .update({ status: newStatus })
            .eq('shipment_id', shipmentId);

        if (error) {
            console.error('Error updating status:', error);
            return false;
        }

        setAlerts(prev => prev.map(alert => 
            alert.id === alertId ? { ...alert, status: newStatus as Alert['status'] } : alert
        ));
        return true;
    };

    const fetchAlerts = async () => {
        setLoading(true);
        setError(null);
        const { data, error: err } = await supabase
            .from('shipment_milestones')
            .select('shipment_id, name, status, notes, is_critical, due_date, completed_date, assigned_to, assigned_email, alert_sent, created_at');
        if (err) {
            setError(err.message);
        } else {
            setAlerts((data as SupabaseRow[] || []).map(mapRow));
        }
        setLoading(false);
    };

    useEffect(() => { fetchAlerts(); }, []);

    const filtered = alerts.filter((a) => {
        const matchPriority = priorityFilter === 'All Priorities' || a.priority === priorityFilter;
        const matchStatus   = statusFilter   === 'All Statuses'   || a.status   === statusFilter;
        const matchSearch   = search === '' ||
            a.id.toLowerCase().includes(search.toLowerCase()) ||
            a.milestone.toLowerCase().includes(search.toLowerCase());
        return matchPriority && matchStatus && matchSearch;
    });

    const toggleRow = (id: string) => {
        setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    };

    const highPriority = alerts.filter(a => a.priority === 'Critical').length;
    const pending      = alerts.filter(a => a.status === 'Get Action').length;
    const resolved     = alerts.filter(a => a.status === 'Resolved').length;

    const statsCards = [
        { icon: <AlertCircle size={26} color="#ef4444" />, iconBg: '#fef2f2', count: highPriority, label: 'High Priority Alerts', borderColor: '#fca5a5' },
        { icon: <Clock size={26} color="#f97316" />,        iconBg: '#fff7ed', count: pending,      label: 'Pending Review',       borderColor: '#fdba74' },
        { icon: <CheckCircle2 size={26} color="#22c55e" />, iconBg: '#f0fdf4', count: resolved,     label: 'Resolved',             borderColor: '#86efac' },
    ];

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading alerts...</div>;
    if (error)   return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>;

    return (
        <div>
            {/* ── Modals ── */}
            <AlertDetailsModal
                isOpen={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                alertData={selectedAlert}
                onEmailClick={openCompose}
            />
            <EmailComposeModal
                isOpen={composeOpen}
                onClose={() => setComposeOpen(false)}
                alertData={selectedAlert}
            />

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.4px' }}>Alert Dashboard</h1>
                    <p style={{ fontSize: '13.5px', color: '#6b7280', marginTop: '4px' }}>Overview of shipment delays and critical issues requiring attention.</p>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <Download size={14} /> Export Report
                </button>
            </div>

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {statsCards.map((card) => (
                    <div key={card.label} style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${card.borderColor}` }}>
                            {card.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '30px', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1 }}>{card.count}</div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table card */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', overflow: 'hidden' }}>

                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                    {[
                        { label: priorityFilter, options: ['All Priorities', 'Critical', 'Medium'], setter: setPriorityFilter },
                        { label: statusFilter,   options: ['All Statuses', 'Get Action', 'Action Taken', 'Resolved'], setter: setStatusFilter },
                    ].map((f) => (
                        <div key={f.label} style={{ position: 'relative' }}>
                            <select value={f.label} onChange={(e) => f.setter(e.target.value)} style={{ appearance: 'none', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 30px 7px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer', outline: 'none' }}>
                                {f.options.map((o) => <option key={o}>{o}</option>)}
                            </select>
                            <ChevronRight size={12} color="#9ca3af" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                        </div>
                    ))}
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 12px', width: '200px' }}>
                        <Search size={13} color="#9ca3af" />
                        <input placeholder="Search table..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%', color: '#374151' }} />
                    </div>
                    <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        {[
                            { key: 'table', icon: <LayoutList size={15} />, label: 'Table' },
                            { key: 'cards', icon: <LayoutGrid size={15} />, label: 'Cards' },
                        ].map((v) => (
                            <button key={v.key} onClick={() => setViewMode(v.key)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: viewMode === v.key ? '#f0f4ff' : 'white', color: viewMode === v.key ? '#4f8ef7' : '#6b7280', border: 'none', fontSize: '12.5px', fontWeight: viewMode === v.key ? 600 : 400, cursor: 'pointer', borderRight: v.key === 'table' ? '1px solid #e5e7eb' : 'none' }}>
                                {v.icon} {v.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TABLE VIEW */}
                {viewMode === 'table' && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                                    <th style={thStyle}>SHIPMENT ID</th>
                                    <th style={thStyle}>ASSIGNED TO</th>
                                    <th style={thStyle}>PRIORITY</th>
                                    <th style={thStyle}>MILESTONE</th>
                                    <th style={thStyle}>NOTES</th>
                                    <th style={thStyle}>DELAY</th>
                                    <th style={thStyle}>STATUS</th>
                                    <th style={thStyle}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((alert, idx) => (
                                    <tr key={alert.id}
                                        style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none', background: selected.includes(alert.id) ? '#f0f4ff' : 'white', transition: 'background 0.15s', cursor: 'pointer' }}
                                        onClick={() => openDetails(alert)}
                                        onMouseEnter={(e) => { if (!selected.includes(alert.id)) e.currentTarget.style.background = '#fafbff'; }}
                                        onMouseLeave={(e) => { if (!selected.includes(alert.id)) e.currentTarget.style.background = 'white'; }}
                                    >
                                        <td style={{ ...tdStyle, fontWeight: 600, fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>{alert.client}</td>
                                        <td style={tdStyle}><ClientAvatar initial={alert.clientInitial} color={alert.clientColor} name={alert.client} /></td>
                                        <td style={tdStyle}><PriorityBadge level={alert.priority} /></td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                <MilestoneIcon type={alert.milestoneIcon} />{alert.milestone}
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, fontSize: '13px', color: '#6b7280', maxWidth: '220px' }}>
                                            <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{alert.issue}</span>
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: 700, fontSize: '13px', color: alert.delayColor, whiteSpace: 'nowrap' }}>{alert.delay}</td>
                                        <td style={tdStyle}><StatusBadge status={alert.status} /></td>
                                        <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <ActionBtn icon={<Eye size={14} />}  title="View"  onClick={() => openDetails(alert)} />
                                                <ActionBtn icon={<Mail size={14} />} title="Email" onClick={() => openCompose(toAlertData(alert))} />
                                                <input 
                                                    type="checkbox" 
                                                    checked={alert.status === 'Action Taken'}
                                                    onChange={async (e) => {
                                                        e.stopPropagation();
                                                        const newStatus = e.target.checked ? 'Action Taken' : 'Get Action';
                                                        await updateAlertStatus(alert.id, newStatus);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* CARDS VIEW */}
                {viewMode === 'cards' && (
                    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                        {filtered.map((alert) => (
                            <div key={alert.id}
                                onClick={() => openDetails(alert)}
                                style={{ border: '1px solid #e8ecf0', borderRadius: '10px', padding: '16px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#374151' }}>{alert.client}</span>
                                    <PriorityBadge level={alert.priority} />
                                </div>
                                <ClientAvatar initial={alert.clientInitial} color={alert.clientColor} name={alert.client} />
                                <div style={{ marginTop: '12px', fontSize: '12.5px', color: '#6b7280', lineHeight: 1.5 }}>{alert.issue}</div>
                                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <StatusBadge status={alert.status} />
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: alert.delayColor }}>{alert.delay === '—' ? '' : alert.delay}</span>
                                </div>
                                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                    <ActionBtn icon={<Eye size={14} />}  title="View"  onClick={() => openDetails(alert)} />
                                    <ActionBtn icon={<Mail size={14} />} title="Email" onClick={() => openCompose(toAlertData(alert))} />
                                    <input 
                                        type="checkbox" 
                                        checked={alert.status === 'Action Taken'}
                                        onChange={async (e) => {
                                            e.stopPropagation();
                                            const newStatus = e.target.checked ? 'Action Taken' : 'Get Action';
                                            await updateAlertStatus(alert.id, newStatus);
                                        }}
                                        style={{ marginLeft: '4px', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>Showing 1 to {filtered.length} of {filtered.length} results</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <PageBtn label="Previous" icon={<ChevronLeft size={13} />} />
                        <PageBtn label="Next" icon={<ChevronRight size={13} />} right />
                    </div>
                </div>
            </div>
        </div>
    );
}