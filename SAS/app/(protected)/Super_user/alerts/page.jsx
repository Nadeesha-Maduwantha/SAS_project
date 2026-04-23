'use client';

import { useState } from 'react';
import {
    AlertCircle,
    Clock,
    CheckCircle2,
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
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

// ─── Data ────────────────────────────────────────────────────────────────────
const ALERTS = [
    {
        id: '#SHP-9921',
        client: 'TechParts Inc.',
        clientInitial: 'T',
        clientColor: '#3b82f6',
        priority: 'Critical',
        milestone: 'Port Arrival',
        milestoneIcon: 'anchor',
        issue: 'Customs clearance documentation missing...',
        delay: '3 Days',
        delayColor: '#ef4444',
        status: 'Open',
    },
    {
        id: '#SHP-8842',
        client: 'Global Retailers',
        clientInitial: 'G',
        clientColor: '#22c55e',
        priority: 'High',
        milestone: 'In Transit',
        milestoneIcon: 'truck',
        issue: 'Driver delayed due to weather conditions',
        delay: '12 Hours',
        delayColor: '#f97316',
        status: 'Processing',
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
        status: 'Investigating',
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
        status: 'Open',
    },
];

// ─── Small helpers ────────────────────────────────────────────────────────────
function PriorityBadge({ level }) {
    const map = {
        Critical: { bg: '#fef2f2', color: '#dc2626', dot: '#dc2626' },
        High: { bg: '#fff7ed', color: '#ea580c', dot: '#f97316' },
        Medium: { bg: '#fefce8', color: '#ca8a04', dot: '#eab308' },
        Low: { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
    };
    const s = map[level] || map.Low;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: s.bg, color: s.color,
            fontSize: '11.5px', fontWeight: 600,
            padding: '3px 9px', borderRadius: '20px',
        }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            {level}
        </span>
    );
}

function StatusBadge({ status }) {
    const map = {
        Open: { bg: '#fff0f0', color: '#dc2626', border: '#fca5a5' },
        Processing: { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
        Investigating: { bg: '#fefce8', color: '#b45309', border: '#fcd34d' },
        Resolved: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
    };
    const s = map[status] || map.Open;
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
    const map = {
        anchor: <Anchor {...props} />,
        truck: <Truck {...props} />,
        warehouse: <Warehouse {...props} />,
        plane: <Plane {...props} />,
        navigation: <Navigation {...props} />,
    };
    return map[type] || null;
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AlertDashboardPage() {
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
    const [priorityFilter, setPriorityFilter] = useState('All Priorities');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);

    const filtered = ALERTS.filter((a) => {
        const matchPriority = priorityFilter === 'All Priorities' || a.priority === priorityFilter;
        const matchStatus = statusFilter === 'All Statuses' || a.status === statusFilter;
        const matchSearch = search === '' ||
            a.id.toLowerCase().includes(search.toLowerCase()) ||
            a.client.toLowerCase().includes(search.toLowerCase()) ||
            a.issue.toLowerCase().includes(search.toLowerCase());
        return matchPriority && matchStatus && matchSearch;
    });

    const toggleRow = (id) => {
        setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    };

    const statsCards = [
        {
            icon: <AlertCircle size={26} color="#ef4444" />,
            iconBg: '#fef2f2',
            count: 14,
            label: 'High Priority Alerts',
            borderColor: '#fca5a5',
        },
        {
            icon: <Clock size={26} color="#f97316" />,
            iconBg: '#fff7ed',
            count: 42,
            label: 'Pending Review',
            borderColor: '#fdba74',
        },
        {
            icon: <CheckCircle2 size={26} color="#22c55e" />,
            iconBg: '#f0fdf4',
            count: 8,
            label: 'Resolved Today',
            borderColor: '#86efac',
        },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
            <Sidebar />

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <Topbar />

                <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

                    {/* Page header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div>
                            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.4px' }}>
                                Alert Dashboard
                            </h1>
                            <p style={{ fontSize: '13.5px', color: '#6b7280', marginTop: '4px' }}>
                                Overview of shipment delays and critical issues requiring attention.
                            </p>
                        </div>
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#374151',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}>
                            <Download size={14} />
                            Export Report
                        </button>
                    </div>

                    {/* Stats cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        marginBottom: '24px',
                    }}>
                        {statsCards.map((card) => (
                            <div key={card.label} style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '20px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '18px',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                border: `1px solid #f0f0f0`,
                                transition: 'box-shadow 0.2s',
                            }}>
                                <div style={{
                                    width: '52px', height: '52px',
                                    borderRadius: '12px',
                                    background: card.iconBg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    border: `1px solid ${card.borderColor}`,
                                }}>
                                    {card.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: '30px', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1 }}>
                                        {card.count}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                        {card.label}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        border: '1px solid #f0f0f0',
                        overflow: 'hidden',
                    }}>
                        {/* Toolbar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '14px 20px',
                            borderBottom: '1px solid #f0f0f0',
                            flexWrap: 'wrap',
                        }}>
                            {/* Filters */}
                            {[
                                { label: priorityFilter, options: ['All Priorities', 'Critical', 'High', 'Medium', 'Low'], setter: setPriorityFilter },
                                { label: statusFilter, options: ['All Statuses', 'Open', 'Processing', 'Investigating', 'Resolved'], setter: setStatusFilter },
                            ].map((f) => (
                                <div key={f.label} style={{ position: 'relative' }}>
                                    <select
                                        value={f.label}
                                        onChange={(e) => f.setter(e.target.value)}
                                        style={{
                                            appearance: 'none',
                                            background: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '7px 30px 7px 12px',
                                            fontSize: '13px',
                                            color: '#374151',
                                            cursor: 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        {f.options.map((o) => <option key={o}>{o}</option>)}
                                    </select>
                                    <ChevronRight size={12} color="#9ca3af" style={{
                                        position: 'absolute', right: '10px', top: '50%',
                                        transform: 'translateY(-50%) rotate(90deg)',
                                        pointerEvents: 'none',
                                    }} />
                                </div>
                            ))}

                            {/* Spacer */}
                            <div style={{ flex: 1 }} />

                            {/* Search */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '7px 12px',
                                width: '200px',
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
                            <div style={{
                                display: 'flex', borderRadius: '8px',
                                border: '1px solid #e5e7eb', overflow: 'hidden',
                            }}>
                                {[
                                    { key: 'table', icon: <LayoutList size={15} />, label: 'Table' },
                                    { key: 'cards', icon: <LayoutGrid size={15} />, label: 'Cards' },
                                ].map((v) => (
                                    <button
                                        key={v.key}
                                        onClick={() => setViewMode(v.key)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            padding: '7px 12px',
                                            background: viewMode === v.key ? '#f0f4ff' : 'white',
                                            color: viewMode === v.key ? '#4f8ef7' : '#6b7280',
                                            border: 'none',
                                            fontSize: '12.5px', fontWeight: viewMode === v.key ? 600 : 400,
                                            cursor: 'pointer',
                                            borderRight: v.key === 'table' ? '1px solid #e5e7eb' : 'none',
                                        }}
                                    >
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
                                            <th style={thStyle}><input type="checkbox" /></th>
                                            <th style={thStyle}>SHIPMENT ID</th>
                                            <th style={thStyle}>CLIENT</th>
                                            <th style={thStyle}>PRIORITY</th>
                                            <th style={thStyle}>MILESTONE</th>
                                            <th style={thStyle}>ISSUE DESCRIPTION</th>
                                            <th style={thStyle}>DELAY</th>
                                            <th style={thStyle}>STATUS</th>
                                            <th style={thStyle}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((alert, idx) => (
                                            <tr
                                                key={alert.id}
                                                style={{
                                                    borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none',
                                                    background: selected.includes(alert.id) ? '#f0f4ff' : 'white',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!selected.includes(alert.id)) e.currentTarget.style.background = '#fafbff';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!selected.includes(alert.id)) e.currentTarget.style.background = 'white';
                                                }}
                                            >
                                                <td style={tdStyle}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.includes(alert.id)}
                                                        onChange={() => toggleRow(alert.id)}
                                                    />
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: 600, fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
                                                    {alert.id}
                                                </td>
                                                <td style={tdStyle}>
                                                    <ClientAvatar initial={alert.clientInitial} color={alert.clientColor} name={alert.client} />
                                                </td>
                                                <td style={tdStyle}>
                                                    <PriorityBadge level={alert.priority} />
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
                                                <td style={tdStyle}>
                                                    <StatusBadge status={alert.status} />
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <ActionBtn icon={<Eye size={14} />} title="View" />
                                                        <ActionBtn icon={<Mail size={14} />} title="Email" />
                                                        <ActionBtn icon={<MoreHorizontal size={14} />} title="More" />
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
                                    <div key={alert.id} style={{
                                        border: '1px solid #e8ecf0',
                                        borderRadius: '10px',
                                        padding: '16px',
                                        background: 'white',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#374151' }}>{alert.id}</span>
                                            <PriorityBadge level={alert.priority} />
                                        </div>
                                        <ClientAvatar initial={alert.clientInitial} color={alert.clientColor} name={alert.client} />
                                        <div style={{ marginTop: '12px', fontSize: '12.5px', color: '#6b7280', lineHeight: 1.5 }}>{alert.issue}</div>
                                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <StatusBadge status={alert.status} />
                                            <span style={{ fontWeight: 700, fontSize: '13px', color: alert.delayColor }}>
                                                ⏱ {alert.delay}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 20px',
                            borderTop: '1px solid #f0f0f0',
                        }}>
                            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                                Showing 1 to {filtered.length} of 42 results
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <PageBtn label="Previous" icon={<ChevronLeft size={13} />} />
                                <PageBtn label="Next" icon={<ChevronRight size={13} />} right />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// ─── Tiny reusable components ─────────────────────────────────────────────────
const thStyle = {
    padding: '11px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    color: '#9ca3af',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
};

const tdStyle = {
    padding: '13px 16px',
    verticalAlign: 'middle',
};

function ActionBtn({ icon, title }) {
    return (
        <button
            title={title}
            style={{
                width: '28px', height: '28px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4f8ef7'; e.currentTarget.style.color = '#4f8ef7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
        >
            {icon}
        </button>
    );
}

function PageBtn({ label, icon, right }) {
    return (
        <button style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '7px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: 'white',
            fontSize: '13px',
            color: '#374151',
            cursor: 'pointer',
            fontWeight: 500,
            flexDirection: right ? 'row-reverse' : 'row',
        }}>
            {icon}
            {label}
        </button>
    );
}
