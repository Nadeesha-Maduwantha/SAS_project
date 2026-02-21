'use client';

import { useState } from 'react';
import {
    AlertCircle,
    Download,
    Search,
    Eye,
    Mail,
    MoreHorizontal,
    Anchor,
    Truck,
    Warehouse,
    Plane,
    Navigation,
    LayoutList,
    LayoutGrid,
    ChevronLeft,
    ChevronRight,
    Zap,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import EmailComposeModal from '@/components/EmailComposeModal';
import AlertDetailsModal from '@/components/AlertDetailsModal';

// ─── All alerts — only Critical ones will be shown ────────────────────────────
const ALL_ALERTS = [
    {
        id: '#SHP-9921',
        client: 'TechParts Inc.',
        clientInitial: 'T',
        clientColor: '#3b82f6',
        priority: 'Critical',
        milestone: 'Port Arrival',
        milestoneIcon: 'anchor',
        issue: 'Customs clearance documentation missing...',
        delayColor: '#ef4444',
        status: 'Get Action',
    },
    {
        id: '#SHP-8842',
        client: 'Global Retailers',
        clientInitial: 'G',
        clientColor: '#22c55e',
        priority: 'Medium',
        milestone: 'In Transit',
        milestoneIcon: 'truck',
        issue: 'Driver delayed due to weather conditions',
        delay: '12 Hours',
        delayColor: '#6b7280',
        status: 'Action Taken',
    },
    {
        id: '#SHP-7731',
        client: 'FreshFoods Co.',
        clientInitial: 'F',
        clientColor: '#f59e0b',
        priority: 'Medium',
        milestone: 'Warehousing',
        milestoneIcon: 'warehouse',
        issue: 'Pallet damage reported during unloading',
        delay: '2 Hours',
        delayColor: '#6b7280',
        status: 'Get Action',
    },
    {
        id: '#SHP-6210',
        client: 'AutoMotive Ltd.',
        clientInitial: 'A',
        clientColor: '#8b5cf6',
        priority: 'Low',
        milestone: 'Departure',
        milestoneIcon: 'plane',
        issue: 'Minor delay in loading sequence',
        delay: '30 Min',
        delayColor: '#6b7280',
        status: 'Resolved',
    },
    {
        id: '#SHP-5692',
        client: 'MediCare Supply',
        clientInitial: 'M',
        clientColor: '#ec4899',
        priority: 'Critical',
        milestone: 'Last Mile',
        milestoneIcon: 'navigation',
        issue: 'Temperature excursion in refrigerated unit',
        delay: '1 Day',
        delayColor: '#ef4444',
        status: 'Get Action',
    },
    {
        id: '#SHP-4410',
        client: 'Steel Works Ltd.',
        clientInitial: 'S',
        clientColor: '#0ea5e9',
        priority: 'Critical',
        milestone: 'Port Arrival',
        milestoneIcon: 'anchor',
        issue: 'Container held at port — inspection required',
        delay: '2 Days',
        delayColor: '#ef4444',
        status: 'Get Action',
    },
];

// Only Critical
const URGENT_ALERTS = ALL_ALERTS.filter((a) => a.priority === 'Critical');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        'Get Action': { bg: '#fff0f0', color: '#dc2626', border: '#fca5a5' },
        'Action Taken': { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
        'Resolved': { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    };
    const s = map[status] || map['Get Action'];
    return (
        <span style={{
            display: 'inline-block',
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
            fontSize: '11px', fontWeight: 600,
            padding: '3px 10px', borderRadius: '6px',
            whiteSpace: 'nowrap',
        }}>
            {status}
        </span>
    );
}

function MilestoneIcon({ type }) {
    const props = { size: 14, color: '#6b7280' };
    const icons = {
        anchor: <Anchor {...props} />,
        truck: <Truck {...props} />,
        warehouse: <Warehouse {...props} />,
        plane: <Plane {...props} />,
        navigation: <Navigation {...props} />,
    };
    return icons[type] || null;
}

function ClientAvatar({ initial, color, name }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: color, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '11px', flexShrink: 0,
            }}>
                {initial}
            </div>
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{name}</span>
        </div>
    );
}

function ActionBtn({ icon, title, onClick }) {
    return (
        <button onClick={onClick} title={title} style={{
            width: '28px', height: '28px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6b7280', cursor: 'pointer',
        }}>
            {icon}
        </button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UrgentAlertsPage() {
    const [viewMode, setViewMode] = useState('table');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);
    const [composeModalData, setComposeModalData] = useState(null);
    const [viewModalData, setViewModalData] = useState(null);
    const [alertsList, setAlertsList] = useState(URGENT_ALERTS);

    const filtered = alertsList.filter((a) => {
        const matchStatus = statusFilter === 'All Statuses' || a.status === statusFilter;
        const matchSearch = search === '' ||
            a.id.toLowerCase().includes(search.toLowerCase()) ||
            a.client.toLowerCase().includes(search.toLowerCase()) ||
            a.issue.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const toggleActionStatus = (id) => {
        setAlertsList(prev => prev.map(a =>
            a.id === id ? { ...a, status: a.status === 'Action Taken' ? 'Get Action' : 'Action Taken' } : a
        ));
    };

    const thStyle = {
        padding: '11px 16px', textAlign: 'left',
        fontSize: '11px', fontWeight: 600, color: '#9ca3af',
        letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    };
    const tdStyle = { padding: '13px 16px', verticalAlign: 'middle' };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
            <Sidebar activePage="urgent" />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <Topbar />

                <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

                    {/* Page header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Zap size={16} color="white" />
                                </div>
                                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.4px' }}>
                                    Urgent Alerts
                                </h1>
                                <span style={{
                                    background: '#fef2f2', color: '#dc2626',
                                    border: '1px solid #fca5a5',
                                    fontSize: '12px', fontWeight: 700,
                                    padding: '2px 10px', borderRadius: '20px',
                                }}>
                                    🔴 Critical Only
                                </span>
                            </div>
                            <p style={{ fontSize: '13.5px', color: '#6b7280', marginLeft: '42px' }}>
                                Showing <strong style={{ color: '#dc2626' }}>{filtered.length}</strong> critical shipment alerts requiring immediate attention.
                            </p>
                        </div>
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            background: 'white', border: '1px solid #e5e7eb',
                            borderRadius: '8px', padding: '8px 16px',
                            fontSize: '13px', fontWeight: 500, color: '#374151',
                            cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}>
                            <Download size={14} />
                            Export Report
                        </button>
                    </div>

                    {/* Critical alert banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)',
                        border: '1px solid #fca5a5',
                        borderLeft: '4px solid #ef4444',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#7f1d1d' }}>
                                {filtered.length} Critical Alerts Need Immediate Action
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#991b1b', marginTop: '2px' }}>
                                These shipments have Critical priority status. Please review and resolve as soon as possible.
                            </div>
                        </div>
                    </div>

                    {/* Table card */}
                    <div style={{
                        background: 'white', borderRadius: '12px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        border: '1px solid #f0f0f0', overflow: 'hidden',
                    }}>
                        {/* Toolbar */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '14px 20px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap',
                        }}>
                            {/* Locked Critical badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: '#fef2f2', border: '1px solid #fca5a5',
                                borderRadius: '8px', padding: '7px 14px',
                                fontSize: '13px', fontWeight: 600, color: '#dc2626',
                            }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626' }} />
                                Critical
                            </div>

                            {/* Status filter */}
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{
                                        appearance: 'none', background: 'white',
                                        border: '1px solid #e5e7eb', borderRadius: '8px',
                                        padding: '8px 32px 8px 12px', fontSize: '13px',
                                        color: '#374151', cursor: 'pointer', outline: 'none'
                                    }}
                                >
                                    {['All Statuses', 'Get Action', 'Action Taken'].map(opt => <option key={opt}>{opt}</option>)}
                                </select>
                                <ChevronRight size={12} color="#9ca3af" style={{
                                    position: 'absolute', right: '10px', top: '50%',
                                    transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none',
                                }} />
                            </div>

                            <div style={{ flex: 1 }} />

                            {/* Search */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: '#f9fafb', border: '1px solid #e5e7eb',
                                borderRadius: '8px', padding: '7px 12px', width: '200px',
                            }}>
                                <Search size={13} color="#9ca3af" />
                                <input
                                    placeholder="Search table..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%', color: '#374151' }}
                                />
                            </div>

                            {/* View toggle */}
                            <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                {[
                                    { key: 'table', icon: <LayoutList size={15} />, label: 'Table' },
                                    { key: 'cards', icon: <LayoutGrid size={15} />, label: 'Cards' },
                                ].map((v) => (
                                    <button key={v.key} onClick={() => setViewMode(v.key)} style={{
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        padding: '7px 12px',
                                        background: viewMode === v.key ? '#fef2f2' : 'white',
                                        color: viewMode === v.key ? '#dc2626' : '#6b7280',
                                        border: 'none', fontSize: '12.5px',
                                        fontWeight: viewMode === v.key ? 600 : 400, cursor: 'pointer',
                                        borderRight: v.key === 'table' ? '1px solid #e5e7eb' : 'none',
                                    }}>
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
                                        <tr style={{ background: '#fef9f9', borderBottom: '1px solid #fde8e8' }}>
                                            <th style={thStyle}>SHIPMENT ID</th>
                                            <th style={thStyle}>CLIENT</th>
                                            <th style={thStyle}>MILESTONE</th>
                                            <th style={thStyle}>ISSUE DESCRIPTION</th>
                                            <th style={thStyle}>DELAY</th>
                                            <th style={thStyle}>STATUS</th>
                                            <th style={thStyle}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                                    No critical alerts found.
                                                </td>
                                            </tr>
                                        ) : filtered.map((alert, idx) => (
                                            <tr key={alert.id} style={{
                                                borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none',
                                                background: selected.includes(alert.id) ? '#fef2f2' : 'white',
                                            }}>
                                                <td style={{ ...tdStyle, fontWeight: 600, fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
                                                    {alert.id}
                                                </td>
                                                <td style={tdStyle}>
                                                    <ClientAvatar initial={alert.clientInitial} color={alert.clientColor} name={alert.client} />
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                        <MilestoneIcon type={alert.milestoneIcon} />
                                                        {alert.milestone}
                                                    </div>
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: '13px', color: '#6b7280', maxWidth: '220px' }}>
                                                    <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {alert.issue}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: 700, fontSize: '13px', color: alert.delayColor, whiteSpace: 'nowrap' }}>
                                                    {alert.delay}
                                                </td>
                                                <td style={tdStyle}><StatusBadge status={alert.status} /></td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <ActionBtn icon={<Eye size={14} />} title="View" onClick={() => setViewModalData(alert)} />
                                                        <ActionBtn icon={<Mail size={14} />} title="Email" onClick={() => setComposeModalData(alert)} />
                                                        {alert.status !== 'Resolved' && (
                                                            <input
                                                                type="checkbox"
                                                                checked={alert.status === 'Action Taken'}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleActionStatus(alert.id);
                                                                }}
                                                                style={{ width: '15px', height: '15px', marginLeft: '4px', cursor: 'pointer' }}
                                                            />
                                                        )}
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
                                    <div
                                        key={alert.id}
                                        onClick={() => setViewModalData(alert)}
                                        style={{
                                            border: '1px solid #fca5a5', borderLeft: '4px solid #ef4444',
                                            borderRadius: '10px', padding: '16px', background: 'white',
                                            boxShadow: '0 1px 3px rgba(239,68,68,0.08)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(239,68,68,0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(239,68,68,0.08)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#374151' }}>{alert.id}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {alert.status !== 'Resolved' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={alert.status === 'Action Taken'}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            toggleActionStatus(alert.id);
                                                        }}
                                                        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                                                    />
                                                )}
                                                <ActionBtn icon={<Mail size={14} />} title="Email" onClick={(e) => { e.stopPropagation(); setComposeModalData(alert); }} />
                                                <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                                                    🔴 Critical
                                                </span>
                                            </div>
                                        </div>
                                        <ClientAvatar initial={alert.clientInitial} color={alert.clientColor} name={alert.client} />
                                        <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#6b7280', lineHeight: 1.5 }}>{alert.issue}</div>
                                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <StatusBadge status={alert.status} />
                                            <span style={{ fontWeight: 700, fontSize: '13px', color: alert.delayColor }}>⏱ {alert.delay}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px', borderTop: '1px solid #f0f0f0',
                        }}>
                            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                                Showing {filtered.length} critical alert{filtered.length !== 1 ? 's' : ''}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[
                                    { label: 'Previous', icon: <ChevronLeft size={13} />, dir: 'row' },
                                    { label: 'Next', icon: <ChevronRight size={13} />, dir: 'row-reverse' },
                                ].map((btn) => (
                                    <button key={btn.label} style={{
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        flexDirection: btn.dir,
                                        padding: '7px 14px', border: '1px solid #e5e7eb',
                                        borderRadius: '8px', background: 'white',
                                        fontSize: '13px', color: '#374151',
                                        cursor: 'pointer', fontWeight: 500,
                                    }}>
                                        {btn.icon}{btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <EmailComposeModal
                isOpen={!!composeModalData}
                onClose={() => setComposeModalData(null)}
                alertData={composeModalData}
            />

            <AlertDetailsModal
                isOpen={!!viewModalData}
                onClose={() => setViewModalData(null)}
                alertData={viewModalData}
                onEmailClick={(alert) => {
                    setViewModalData(null);
                    setComposeModalData(alert);
                }}
            />
        </div>
    );
}
