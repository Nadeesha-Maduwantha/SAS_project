'use client';

import { useState, useEffect } from 'react';
import {
    Mail, Clock, CheckCircle2, XCircle, Search,
    ChevronRight, RefreshCw, Send,
} from 'lucide-react';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';

// ─── Types ────────────────────────────────────────────────────────────────────
type DigestLogRow = {
    id: number;
    super_email: string;
    department: string;
    kind: 'overdue' | 'reminder';
    item_count: number;
    subject: string | null;
    status: 'sent' | 'failed';
    error: string | null;
    sent_at: string;
};

async function parseApiResponse(response: Response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    const text = await response.text();
    return { error: text || `Request failed with status ${response.status}` };
}

// ─── Small components ─────────────────────────────────────────────────────────
function KindBadge({ kind }: { kind: string }) {
    const map: Record<string, { bg: string; color: string }> = {
        overdue:  { bg: '#fef2f2', color: '#dc2626' },
        reminder: { bg: '#fffbeb', color: '#d97706' },
    };
    const s = map[kind] || map.reminder;
    return (
        <span style={{ display: 'inline-block', background: s.bg, color: s.color, fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', textTransform: 'capitalize' }}>
            {kind}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const ok = status === 'sent';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#15803d' : '#dc2626', border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
            {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {ok ? 'Sent' : 'Failed'}
        </span>
    );
}

function DeptBadge({ department }: { department: string }) {
    return (
        <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', border: '1px solid #93c5fd', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
            {department}
        </span>
    );
}

const thStyle: React.CSSProperties = { padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle' };

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuperDigestLogPage() {
    const [rows, setRows] = useState<DigestLogRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [kindFilter, setKindFilter] = useState<string>('All Types');
    const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
    const [search, setSearch] = useState<string>('');
    const [sending, setSending] = useState<boolean>(false);
    const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null);

    const authHeaders = () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '';
        return { Authorization: `Bearer ${token}` };
    };

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/super-digest/history?limit=200`, {
                headers: authHeaders(),
            });
            const payload = await parseApiResponse(response);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to load sent emails');
            }
            setRows((payload.data as DigestLogRow[]) || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sent emails');
        }
        setLoading(false);
    };

    useEffect(() => { fetchHistory(); }, []);

    const handleSendNow = async () => {
        const confirmed = window.confirm(
            'This will immediately email every super user with overdue or upcoming-due milestones in their department. Continue?'
        );
        if (!confirmed) return;

        setSending(true);
        setSendResult(null);
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/super-digest/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ dry_run: false }),
            });
            const payload = await parseApiResponse(response);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to send digest emails');
            }
            const overdue = payload.overdue_emails ?? 0;
            const reminder = payload.reminder_emails ?? 0;
            const failed = (payload.errors || []).length;
            setSendResult({
                ok: failed === 0,
                text: `Sent ${overdue} overdue and ${reminder} reminder email(s)` +
                    (failed ? `, ${failed} failed.` : '.'),
            });
            await fetchHistory();
        } catch (err) {
            setSendResult({ ok: false, text: err instanceof Error ? err.message : 'Failed to send digest emails' });
        }
        setSending(false);
    };

    const filtered = rows.filter((r) => {
        const matchKind   = kindFilter === 'All Types' || r.kind === kindFilter.toLowerCase();
        const matchStatus = statusFilter === 'All Statuses' || r.status === statusFilter.toLowerCase();
        const matchSearch = search === '' ||
            r.super_email.toLowerCase().includes(search.toLowerCase()) ||
            r.department.toLowerCase().includes(search.toLowerCase()) ||
            (r.subject || '').toLowerCase().includes(search.toLowerCase());
        return matchKind && matchStatus && matchSearch;
    });

    const totalSent  = rows.filter(r => r.status === 'sent').length;
    const totalFailed = rows.filter(r => r.status === 'failed').length;
    const overdueCount = rows.filter(r => r.kind === 'overdue').length;
    const reminderCount = rows.filter(r => r.kind === 'reminder').length;

    const statsCards = [
        { icon: <Mail size={26} color="#4f8ef7" />,        iconBg: '#eff6ff', count: totalSent,     label: 'Emails Sent',       borderColor: '#93c5fd' },
        { icon: <Clock size={26} color="#dc2626" />,        iconBg: '#fef2f2', count: overdueCount,  label: 'Overdue Alerts',    borderColor: '#fca5a5' },
        { icon: <Clock size={26} color="#d97706" />,        iconBg: '#fffbeb', count: reminderCount, label: 'Upcoming Reminders', borderColor: '#fde68a' },
        { icon: <XCircle size={26} color="#ef4444" />,      iconBg: '#fef2f2', count: totalFailed,   label: 'Failed',            borderColor: '#fca5a5' },
    ];

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading sent emails...</div>;
    if (error)   return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>;

    return (
        <div>
            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.4px' }}>Super User Digest Emails</h1>
                    <p style={{ fontSize: '13.5px', color: '#6b7280', marginTop: '4px' }}>Automatic overdue and upcoming-reminder emails the system has sent to super users, grouped by department.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={fetchHistory} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                    <button
                        onClick={handleSendNow}
                        disabled={sending}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', borderRadius: '8px', background: sending ? '#93c5fd' : '#4f8ef7', color: 'white', fontSize: '13px', cursor: sending ? 'default' : 'pointer', fontWeight: 600 }}
                    >
                        <Send size={14} /> {sending ? 'Sending…' : 'Send Digest Now'}
                    </button>
                </div>
            </div>

            {/* Send result banner */}
            {sendResult && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
                    padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                    background: sendResult.ok ? '#f0fdf4' : '#fef2f2',
                    color: sendResult.ok ? '#15803d' : '#dc2626',
                    border: `1px solid ${sendResult.ok ? '#86efac' : '#fca5a5'}`,
                }}>
                    {sendResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {sendResult.text}
                </div>
            )}

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
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
                        { label: kindFilter,   options: ['All Types', 'overdue', 'reminder'], setter: setKindFilter },
                        { label: statusFilter, options: ['All Statuses', 'sent', 'failed'],    setter: setStatusFilter },
                    ].map((f) => (
                        <div key={f.label} style={{ position: 'relative' }}>
                            <select value={f.label} onChange={(e) => f.setter(e.target.value)} style={{ appearance: 'none', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 30px 7px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer', outline: 'none', textTransform: 'capitalize' }}>
                                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <ChevronRight size={12} color="#9ca3af" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                        </div>
                    ))}
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 12px', width: '220px' }}>
                        <Search size={13} color="#9ca3af" />
                        <input placeholder="Search email, department or subject..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%', color: '#374151' }} />
                    </div>
                </div>

                {/* TABLE */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                                <th style={thStyle}>SENT AT</th>
                                <th style={thStyle}>SUPER USER</th>
                                <th style={thStyle}>DEPARTMENT</th>
                                <th style={thStyle}>TYPE</th>
                                <th style={thStyle}>ITEMS</th>
                                <th style={thStyle}>SUBJECT</th>
                                <th style={thStyle}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row, idx) => (
                                <tr key={row.id}
                                    title={row.status === 'failed' ? row.error || '' : undefined}
                                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none', background: 'white' }}
                                >
                                    <td style={{ ...tdStyle, fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                        {new Date(row.sent_at).toLocaleString()}
                                    </td>
                                    <td style={{ ...tdStyle, fontSize: '13px', color: '#374151', fontWeight: 500 }}>{row.super_email}</td>
                                    <td style={tdStyle}><DeptBadge department={row.department} /></td>
                                    <td style={tdStyle}><KindBadge kind={row.kind} /></td>
                                    <td style={{ ...tdStyle, fontSize: '13px', color: '#374151' }}>{row.item_count}</td>
                                    <td style={{ ...tdStyle, fontSize: '13px', color: '#6b7280', maxWidth: '320px' }}>
                                        <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{row.subject || '—'}</span>
                                    </td>
                                    <td style={tdStyle}><StatusBadge status={row.status} /></td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                                        No super user digest emails have been sent yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>Showing {filtered.length} of {rows.length} results</span>
                </div>
            </div>
        </div>
    );
}
