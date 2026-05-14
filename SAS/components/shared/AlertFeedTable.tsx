'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Mail, RefreshCw, AlertTriangle } from 'lucide-react';
import EmailComposeModal from '@/components/EmailComposeModal';
import { AlertData } from '@/components/AlertDetailsModal';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AlertMilestone {
  milestone_id:   string;
  name:           string;
  due_date:       string | null;
  overdue_days:   number;
  is_critical:    boolean;
  status:         string;
  assigned_to:    string | null;
  assigned_email: string | null;
  alert_sent:     boolean;
  notes:          string | null;
}

interface ShipmentAlertGroup {
  shipment_id:      string;
  job_number:       string;
  consignee_name:   string;
  consignee_email:  string;
  transport_mode:   string;
  alerts:           AlertMilestone[];
  alert_count:      number;
  overdue_days_max: number;
  has_critical:     boolean;
}

interface Props {
  title?:   string;
  apiBase?: string;
  maxRows?: number;
}

function isUrgent(g: Pick<ShipmentAlertGroup, 'has_critical' | 'alert_count' | 'overdue_days_max'>) {
  return g.has_critical || g.alert_count > 1 || g.overdue_days_max >= 2;
}

const C = {
  red:   { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', accent: '#DC2626', dot: '#EF4444' },
  amber: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', accent: '#D97706', dot: '#F59E0B' },
  crit:  { bg: '#450A0A', text: '#FCA5A5', border: '#7F1D1D' },
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
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

function OverdueBadge({ days }: { days: number }) {
  const tok = days >= 2 ? C.red : C.amber;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: tok.bg, color: tok.text, border: `1px solid ${tok.border}`, whiteSpace: 'nowrap',
    }}>
      {days === 0 ? 'Due today' : `${days}d overdue`}
    </span>
  );
}

// ── Shipment row — two render modes: "flat" (closed) and "card" (open) ─────────
function ShipmentAlertRow({
  group, onEmailClick,
}: {
  group:        ShipmentAlertGroup;
  onEmailClick: (d: AlertData) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [visible,  setVisible]  = useState(false);
  const [closing,  setClosing]  = useState(false);

  const urgent   = isUrgent(group);
  const idTok    = urgent ? C.red    : C.amber;
  const cntTok   = urgent ? C.red    : C.amber;
  const nextDue  = group.alerts[0]?.due_date ?? null;

  const open  = () => { setExpanded(true); setVisible(true);  setClosing(false); };
  const close = () => {
    setClosing(true);
    setTimeout(() => { setVisible(false); setExpanded(false); setClosing(false); }, 270);
  };
  const toggle = () => expanded ? close() : open();

  // ── Shared row content (used in both flat and card layouts) ──────────────────
  const rowContent = (
    <div
      onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '13px 16px 13px 0',
        cursor: 'pointer',
        background: expanded ? '#FAFAFA' : '#fff',
        transition: 'background 0.12s',
        borderRadius: expanded ? '12px 12px 0 0' : 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
      onMouseLeave={e => (e.currentTarget.style.background = expanded ? '#FAFAFA' : '#fff')}
    >
      {/* Chevron */}
      <div style={{ width: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          display: 'inline-flex', transition: 'transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1)',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          color: urgent ? C.red.accent : C.amber.accent,
        }}>
          <ChevronRight size={15} />
        </span>
      </div>

      {/* Shipment ID */}
      <div style={{ width: 160, flexShrink: 0 }}>
        <Tooltip text={`Shipment: ${group.job_number}`}>
          <span style={{
            fontFamily: 'monospace', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
            background: idTok.bg, color: idTok.text, border: `1px solid ${idTok.border}`,
            padding: '4px 11px', borderRadius: 6, cursor: 'help',
          }}>
            {group.job_number}
          </span>
        </Tooltip>
      </div>

      {/* Client */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{group.consignee_name}</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{group.transport_mode}</div>
      </div>

      {/* Badges + next due */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 99,
          background: cntTok.bg, color: cntTok.text, border: `1.5px solid ${cntTok.border}`,
        }}>
          <AlertTriangle size={13} />
          {group.alert_count} {group.alert_count === 1 ? 'alert' : 'alerts'}
        </span>
        {group.has_critical && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 99,
            background: C.crit.bg, color: C.crit.text, border: `1.5px solid ${C.crit.border}`,
            letterSpacing: '0.03em',
          }}>
            ⚠ CRITICAL MILESTONE
          </span>
        )}
        {nextDue && (
          <span style={{ fontSize: 12, color: '#9CA3AF', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#D1D5DB' }}>·</span>
            Most recent due {fmtDate(nextDue)}
          </span>
        )}
      </div>

      {/* Hint */}
      <div style={{ flexShrink: 0, fontSize: 11, color: '#9CA3AF', paddingLeft: 12 }}>
        {expanded ? 'Collapse ↑' : 'View alerts ↓'}
      </div>
    </div>
  );

  // ── CLOSED: normal table row, columns align with header ─────────────────────
  if (!expanded && !visible) {
    return (
      <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
        <td colSpan={7} style={{ padding: 0 }}>
          {rowContent}
        </td>
      </tr>
    );
  }

  // ── OPEN: floating card separated from the table ────────────────────────────
  return (
    <>
      {/* Top spacer — creates visual gap above the card */}
      <tr aria-hidden>
        <td colSpan={7} style={{ padding: 0, height: 10, border: 'none', background: 'transparent' }} />
      </tr>

      {/* The floating card row */}
      <tr>
        <td colSpan={7} style={{ padding: '0 10px' }}>
          <div style={{
            background:   '#fff',
            borderRadius: 12,
            // Layered shadow: tight near-shadow + wide ambient = "lifted" card feel
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 28px rgba(0,0,0,0.11), 0 18px 40px rgba(0,0,0,0.07)',
            border:     '1px solid rgba(0,0,0,0.06)',
            overflow:   'hidden',
          }}>

            {/* Row content inside the card */}
            {rowContent}

            {/* Sub-rows panel */}
            <div style={{
              borderTop:  '1px solid #F3F4F6',
              animation:  closing
                ? 'panelClose 0.26s cubic-bezier(0.4, 0, 1, 1) forwards'
                : 'panelOpen 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
              overflow:   'hidden',
            }}>

              {/* Sub-header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '48px 1fr 150px 140px 130px',
                padding: '7px 16px 7px 0',
                background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
              }}>
                <span />
                {['Milestone', 'Due date', 'Overdue', ''].map((h, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 600, color: '#9CA3AF',
                    textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4,
                  }}>{h}</span>
                ))}
              </div>

              {/* Alert rows */}
              {group.alerts.map((alert, idx) => {
                const mUrgent = alert.is_critical || alert.overdue_days >= 2;
                const tok     = mUrgent ? C.red : C.amber;

                const handleClick = () => onEmailClick({
                  id:            group.job_number,
                  shipment_id:   group.shipment_id,
                  client:        group.consignee_name,
                  priority:      alert.is_critical ? 'Critical' : alert.overdue_days >= 2 ? 'Medium' : 'Low',
                  milestone:     alert.name,
                  milestoneIcon: null,
                  issue:         alert.notes ?? `"${alert.name}" is overdue by ${alert.overdue_days} day(s).`,
                  delay:         `${alert.overdue_days} day${alert.overdue_days !== 1 ? 's' : ''}`,
                  delayColor:    alert.overdue_days >= 2 ? '#DC2626' : '#D97706',
                  status:        'Get Action',
                });

                return (
                  <div
                    key={alert.milestone_id}
                    onClick={handleClick}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '48px 1fr 150px 140px 130px',
                      alignItems: 'center',
                      paddingRight: 16,
                      background: '#fff',
                      borderBottom: idx < group.alerts.length - 1 ? '1px solid #F3F4F6' : 'none',
                      borderLeft:   `3px solid ${tok.dot}`,
                      cursor: 'pointer', transition: 'background 0.1s',
                      animation: `subRowIn 0.28s cubic-bezier(0.22,0.61,0.36,1) ${idx * 55}ms both`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <span />

                    {/* Milestone */}
                    <div style={{ padding: '11px 12px 11px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tok.dot, flexShrink: 0 }} />
                        <Tooltip text={`Milestone: ${alert.name}`}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: tok.text, cursor: 'help' }}>
                            {alert.name}
                          </span>
                        </Tooltip>
                        {alert.is_critical && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                            background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA',
                            letterSpacing: '0.04em',
                          }}>CRITICAL</span>
                        )}
                      </div>
                      {alert.assigned_to && (
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, paddingLeft: 13 }}>{alert.assigned_to}</div>
                      )}
                    </div>

                    {/* Due date */}
                    <div style={{ fontSize: 12, color: '#6B7280', padding: '11px 4px' }}>
                      {fmtDate(alert.due_date)}
                    </div>

                    {/* Overdue */}
                    <div style={{ padding: '11px 4px' }}>
                      <OverdueBadge days={alert.overdue_days} />
                    </div>

                    {/* Send */}
                    <div style={{ padding: '11px 0', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                        background: tok.bg, color: tok.text, border: `1px solid ${tok.border}`,
                      }}>
                        <Mail size={11} /> Send Alert
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </td>
      </tr>

      {/* Bottom spacer — gap below the card */}
      <tr aria-hidden>
        <td colSpan={7} style={{ padding: 0, height: 10, border: 'none', background: 'transparent' }} />
      </tr>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AlertFeedTable({
  title   = 'Alert Feed',
  apiBase = 'http://localhost:5000',
  maxRows = 8,
}: Props) {
  const [groups,    setGroups]    = useState<ShipmentAlertGroup[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [showAll,   setShowAll]   = useState(false);
  const [emailData, setEmailData] = useState<AlertData | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/api/alerts/active`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setGroups(data.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const displayed = showAll ? groups : groups.slice(0, maxRows);
  const redCount  = groups.filter(g => isUrgent(g)).length;
  const orgCount  = groups.length - redCount;

  return (
    <>
      <style>{`
        @keyframes panelOpen  { from { max-height:0;    opacity:0 } to { max-height:600px; opacity:1 } }
        @keyframes panelClose { from { max-height:600px; opacity:1 } to { max-height:0;   opacity:0 } }
        @keyframes subRowIn   { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin       { to { transform:rotate(360deg) } }
      `}</style>

      <div style={{
        background:   '#fff',
        borderRadius: 14,
        border:       '1px solid #E5E7EB',
        boxShadow:    '0 1px 6px rgba(0,0,0,.06)',
        // overflow must NOT be hidden — lets card shadows escape the table bounds
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #F3F4F6',
          flexWrap: 'wrap', gap: 10,
          borderRadius: '14px 14px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h2>
            {!loading && groups.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {redCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                    {redCount} critical
                  </span>
                )}
                {orgCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                    {orgCount} warning
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={fetchAlerts}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
              color: '#6B7280', background: 'none', border: '1px solid #E5E7EB',
              padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={TH} />
                <th style={TH}>Shipment</th>
                <th style={TH}>Client</th>
                <th style={TH} colSpan={3}>Alerts</th>
                <th style={{ ...TH, textAlign: 'right' }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#DC2626', animation: 'spin 0.7s linear infinite' }} />
                      <span style={{ fontSize: 13, color: '#9CA3AF' }}>Loading alerts...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#DC2626', fontSize: 13 }}>⚠ {error}</td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✓</div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#16A34A' }}>All clear</span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>No overdue milestones at this time</span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map(group => (
                  <ShipmentAlertRow key={group.shipment_id} group={group} onEmailClick={setEmailData} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && groups.length > maxRows && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #F3F4F6', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0 0 14px 14px' }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Showing {displayed.length} of {groups.length} shipments</span>
            <button onClick={() => setShowAll(s => !s)} style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              {showAll ? 'Show less ↑' : `View all ${groups.length} →`}
            </button>
          </div>
        )}

        {/* Legend */}
        {!loading && groups.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
              1 day overdue / single alert
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
              2+ days / multiple alerts / critical milestone
            </span>
          </div>
        )}
      </div>

      <EmailComposeModal isOpen={Boolean(emailData)} onClose={() => setEmailData(null)} alertData={emailData} />
    </>
  );
}

const TH: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
};