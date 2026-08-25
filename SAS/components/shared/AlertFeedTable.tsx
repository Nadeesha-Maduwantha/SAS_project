'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Mail, RefreshCw, AlertTriangle, LayoutGrid, List, Search, ChevronDown, X, ArrowRight } from 'lucide-react';
import EmailComposeModal from '@/components/EmailComposeModal';
import { AlertData } from '@/components/AlertDetailsModal';
import ShipmentMilestonesModal from '@/components/Shipmentmilestonesmodal';
import MilestoneDetailModal    from '@/components/Milestonedetailmodal';

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
  has_overdue?:     boolean;   // any milestone past its deadline → dark red
  has_delayed?:     boolean;   // out of sequence, no passed deadline → lighter red
}

interface Props {
  title?:   string;
  apiBase?: string;
  maxRows?: number;
  showFieldDelayed?: boolean;   // include yellow "expected data not arrived" rows/cards
}

// "expected data field delayed / possibly renamed" item (yellow)
interface FDItem {
  id:              string;
  shipment_id:     string;
  job_number:      string | null;
  consignee_name:  string | null;
  milestone_name:  string | null;
  is_critical:     boolean;
  expected_field:  string | null;
  suggested_field: string | null;
  score:           number | null;
  reason:          string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function isUrgent(g: Pick<ShipmentAlertGroup, 'has_critical' | 'alert_count' | 'overdue_days_max'>) {
  return g.has_critical || g.alert_count > 1 || g.overdue_days_max >= 2;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const C = {
  red:     { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', accent: '#B91C1C', dot: '#DC2626' }, // overdue — dark red
  lightred:{ bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3', accent: '#F43F5E', dot: '#FB7185' }, // delayed — lighter red
  amber:   { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', accent: '#D97706', dot: '#F59E0B' }, // field mismatch — yellow
  crit:    { bg: '#450A0A', text: '#FCA5A5', border: '#7F1D1D' },
};

// Group colour: dark red once anything in it is truly overdue, otherwise the
// lighter "delayed" red. (Yellow/amber is reserved for field-name mismatches.)
function tok(group: ShipmentAlertGroup) {
  return (group.has_overdue ?? isUrgent(group)) ? C.red : C.lightred;
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

function OverdueBadge({ days, status }: { days: number; status?: string }) {
  // Delayed = out of sequence with no measured deadline → lighter red "Delayed".
  const delayed = status === 'delayed';
  const t = delayed ? C.lightred : C.red;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: t.bg, color: t.text, border: `1px solid ${t.border}`, whiteSpace: 'nowrap',
    }}>
      {delayed ? 'Delayed' : days === 0 ? 'Due today' : `${days}d overdue`}
    </span>
  );
}

// ── Milestone popup (shown when card is clicked) ───────────────────────────────
function MilestonePopup({
  group, onClose, onEmailClick,
}: {
  group: ShipmentAlertGroup;
  onClose: () => void;
  onEmailClick: (d: AlertData) => void;
}) {
  const urgent = isUrgent(group);
  const t      = (group.has_overdue ?? urgent) ? C.red : C.lightred;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 620, maxHeight: '85vh',
        background: '#fff', borderRadius: 14,
        boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'scaleIn 0.18s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: t.bg,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 16, fontWeight: 800,
                color: t.text, letterSpacing: '-0.01em',
              }}>
                {group.job_number}
              </span>
              {group.has_critical && (
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                  background: C.crit.bg, color: C.crit.text, border: `1px solid ${C.crit.border}`,
                  letterSpacing: '0.06em',
                }}>
                  ⚠ CRITICAL
                </span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: '#fff', color: t.text, border: `1px solid ${t.border}`,
              }}>
                {group.alert_count} {group.alert_count === 1 ? 'alert' : 'alerts'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: t.text, marginTop: 3, opacity: 0.8 }}>
              {group.consignee_name} · {group.transport_mode}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.6)', border: `1px solid ${t.border}`,
              borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.text,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Sub-header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 130px 120px 110px',
          padding: '8px 24px', background: '#F9FAFB',
          borderBottom: '1px solid #E5E7EB',
        }}>
          {['Milestone', 'Due Date', 'Overdue', ''].map((h, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 700, color: '#9CA3AF',
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>{h}</span>
          ))}
        </div>

        {/* Milestone cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {group.alerts.map((alert, idx) => {
            const mDelayed = alert.status === 'delayed';
            const mt       = mDelayed ? C.lightred : C.red;

            const handleSend = () => onEmailClick({
              id:            group.job_number,
              shipment_id:   group.shipment_id,
              client:        group.consignee_name,
              priority:      alert.is_critical ? 'Critical' : mDelayed ? 'Low' : 'Medium',
              milestone:     alert.name,
              milestoneIcon: null,
              issue:         alert.notes ?? (mDelayed
                               ? `"${alert.name}" is delayed — a later milestone arrived first.`
                               : `"${alert.name}" is overdue by ${alert.overdue_days} day(s).`),
              delay:         mDelayed ? 'Delayed' : `${alert.overdue_days} day${alert.overdue_days !== 1 ? 's' : ''}`,
              delayColor:    mDelayed ? '#F43F5E' : '#B91C1C',
              status:        'Get Action',
            });

            return (
              <div
                key={alert.milestone_id}
                style={{
                  background: '#fff', borderRadius: 10,
                  border: `1.5px solid ${mt.border}`,
                  borderLeft: `4px solid ${mt.dot}`,
                  padding: '12px 16px',
                  display: 'grid', gridTemplateColumns: '1fr 130px 120px 110px',
                  alignItems: 'center', gap: 8,
                  animation: `subRowIn 0.25s ease ${idx * 50}ms both`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Milestone name */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: mt.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: mt.text }}>
                      {alert.name}
                    </span>
                    {alert.is_critical && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3,
                        background: C.crit.bg, color: C.crit.text, letterSpacing: '0.05em',
                      }}>CRITICAL</span>
                    )}
                  </div>
                  {alert.assigned_to && (
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, paddingLeft: 13 }}>
                      {alert.assigned_to}
                    </div>
                  )}
                  {alert.notes && (
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, paddingLeft: 13, lineHeight: 1.4 }}>
                      {alert.notes}
                    </div>
                  )}
                </div>

                {/* Due date */}
                <div style={{ fontSize: 12, color: '#6B7280' }}>{fmtDate(alert.due_date)}</div>

                {/* Overdue badge */}
                <div><OverdueBadge days={alert.overdue_days} status={alert.status} /></div>

                {/* Send alert button */}
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={handleSend}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 6,
                      background: mt.bg, color: mt.text, border: `1px solid ${mt.border}`,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <Mail size={11} /> Send Alert
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Alert Card (card view) ─────────────────────────────────────────────────────
function AlertCard({
  group, onClick,
}: {
  group:   ShipmentAlertGroup;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  const urgent        = isUrgent(group);
  const t             = (group.has_overdue ?? urgent) ? C.red : C.lightred;
  const nextDue       = group.alerts[0]?.due_date ?? null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   '#fff',
        borderRadius: 12,
        borderTop:    `4px solid ${t.dot}`,
        borderRight:  `1.5px solid ${hov ? t.border : '#E5E7EB'}`,
        borderBottom: `1.5px solid ${hov ? t.border : '#E5E7EB'}`,
        borderLeft:   `1.5px solid ${hov ? t.border : '#E5E7EB'}`,
        boxShadow:    hov
          ? `0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)`
          : '0 1px 4px rgba(0,0,0,0.05)',
        cursor:      'pointer',
        transition:  'all 0.18s ease',
        transform:   hov ? 'translateY(-2px)' : 'translateY(0)',
        overflow:    'hidden',
        // Fixed card size — responsive grid handles columns
        minHeight:   200,
        display:     'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card top strip */}
      <div style={{
        padding: '14px 16px 10px',
        background: hov ? t.bg : '#FAFAFA',
        borderBottom: `1px solid ${hov ? t.border : '#F3F4F6'}`,
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          {/* Shipment ID */}
          <span style={{
            fontFamily: 'monospace', fontSize: 14, fontWeight: 800,
            color: t.text, letterSpacing: '-0.01em',
            background: t.bg, border: `1px solid ${t.border}`,
            padding: '3px 9px', borderRadius: 6,
          }}>
            {group.job_number}
          </span>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
              background: t.bg, color: t.text, border: `1px solid ${t.border}`,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <AlertTriangle size={11} />
              {group.alert_count} {group.alert_count === 1 ? 'alert' : 'alerts'}
            </span>
            {group.has_critical && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99,
                background: C.crit.bg, color: C.crit.text, border: `1px solid ${C.crit.border}`,
                letterSpacing: '0.04em',
              }}>
                ⚠ CRITICAL
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Consignee */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Client
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
            {group.consignee_name}
          </div>
        </div>

        {/* Transport mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD',
          }}>
            {group.transport_mode}
          </span>
        </div>

          {/* Description from notes */}
        {group.alerts[0]?.notes && (
          <div style={{
            fontSize: 11, color: '#6B7280', lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {group.alerts[0].notes}
          </div>
        )}


        {/* Most overdue */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Most Recent Due
            </div>
            <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
              {fmtDate(nextDue)}
            </div>
          </div>
          <OverdueBadge days={group.overdue_days_max} status={group.has_overdue ? 'overdue' : 'delayed'} />
        </div>
      </div>

      {/* Card footer */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid #F3F4F6',
        background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      }}>
        <span style={{ fontSize: 11, color: t.text, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          View alerts <ChevronRight size={12} />
        </span>
      </div>
    </div>
  );
}

// ── Table row (unchanged logic from original) ──────────────────────────────────
function ShipmentAlertRow({
  group, onEmailClick, onShipmentClick, onMilestoneClick,
}: {
  group:             ShipmentAlertGroup;
  onEmailClick:      (d: AlertData) => void;
  onShipmentClick:   (shipmentId: string) => void;
  onMilestoneClick?: (milestoneId: string, shipmentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [visible,  setVisible]  = useState(false);
  const [closing,  setClosing]  = useState(false);

  const urgent  = isUrgent(group);
  const t       = (group.has_overdue ?? urgent) ? C.red : C.lightred;
  const nextDue = group.alerts[0]?.due_date ?? null;

  const open  = () => { setExpanded(true); setVisible(true);  setClosing(false); };
  const close = () => {
    setClosing(true);
    setTimeout(() => { setVisible(false); setExpanded(false); setClosing(false); }, 270);
  };
  const toggle = () => (expanded ? close() : open());

  const rowContent = (
    <div
      onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '13px 16px 13px 0', cursor: 'pointer',
        background: expanded ? '#FAFAFA' : '#fff', transition: 'background 0.12s',
        borderRadius: expanded ? '12px 12px 0 0' : 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
      onMouseLeave={e => (e.currentTarget.style.background = expanded ? '#FAFAFA' : '#fff')}
    >
      <div style={{ width: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          display: 'inline-flex', transition: 'transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1)',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', color: t.accent,
        }}>
          <ChevronRight size={15} />
        </span>
      </div>
      <div style={{ width: 160, flexShrink: 0 }}>
        <Tooltip text={`Shipment: ${group.job_number} — click to view`}>
          <span
            onClick={e => { e.stopPropagation(); onShipmentClick(group.shipment_id); }}
            style={{
              fontFamily: 'monospace', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
              background: t.bg, color: t.text, border: `1px solid ${t.border}`,
              padding: '4px 11px', borderRadius: 6,
              cursor: 'pointer',                      // ← was 'help', now 'pointer'
              textDecoration: 'underline',            // ← ADD
              textDecorationStyle: 'dotted',          // ← ADD
              textDecorationColor: t.border,          // ← ADD
            }}
          >
            {group.job_number}
          </span>
        </Tooltip>
      </div>
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{group.consignee_name}</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{group.transport_mode}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 99,
          background: t.bg, color: t.text, border: `1.5px solid ${t.border}`,
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
      <div style={{ flexShrink: 0, fontSize: 11, color: '#9CA3AF', paddingLeft: 12 }}>
        {expanded ? 'Collapse ↑' : 'View alerts ↓'}
      </div>
    </div>
  );

  if (!expanded && !visible) {
    return (
      <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
        <td colSpan={7} style={{ padding: 0 }}>{rowContent}</td>
      </tr>
    );
  }

  return (
    <>
      <tr aria-hidden><td colSpan={7} style={{ padding: 0, height: 10, border: 'none', background: 'transparent' }} /></tr>
      <tr>
        <td colSpan={7} style={{ padding: '0 10px' }}>
          <div style={{
            background: '#fff', borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 28px rgba(0,0,0,0.11)',
            border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden',
          }}>
            {rowContent}
            <div style={{
              borderTop: '1px solid #F3F4F6',
              animation: closing ? 'panelClose 0.26s cubic-bezier(0.4,0,1,1) forwards' : 'panelOpen 0.3s cubic-bezier(0.22,0.61,0.36,1) forwards',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '48px 1fr 150px 140px 130px',
                padding: '7px 16px 7px 0', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
              }}>
                <span />
                {['Milestone', 'Due date', 'Overdue', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4 }}>{h}</span>
                ))}
              </div>
              {group.alerts.map((alert, idx) => {
                const mDelayed = alert.status === 'delayed';
                const mt       = mDelayed ? C.lightred : C.red;
                const handleClick = () => onEmailClick({
                  id: group.job_number, shipment_id: group.shipment_id,
                  client: group.consignee_name,
                  priority: alert.is_critical ? 'Critical' : mDelayed ? 'Low' : 'Medium',
                  milestone: alert.name, milestoneIcon: null,
                  issue: alert.notes ?? (mDelayed
                           ? `"${alert.name}" is delayed — a later milestone arrived first.`
                           : `"${alert.name}" is overdue by ${alert.overdue_days} day(s).`),
                  delay: mDelayed ? 'Delayed' : `${alert.overdue_days} day${alert.overdue_days !== 1 ? 's' : ''}`,
                  delayColor: mDelayed ? '#F43F5E' : '#B91C1C',
                  status: 'Get Action',
                  dueDate: alert.due_date,
                  alertStatus: alert.status || 'overdue',
                  isCritical: alert.is_critical,
                });
                return (
                  <div key={alert.milestone_id} onClick={() => {
                    if (onMilestoneClick) {
                      onMilestoneClick(alert.milestone_id, group.shipment_id);
                    } else {
                      handleClick();
                    }
                  }} style={{
                    display: 'grid', gridTemplateColumns: '48px 1fr 150px 140px 130px',
                    alignItems: 'center', paddingRight: 16, background: '#fff',
                    borderBottom: idx < group.alerts.length - 1 ? '1px solid #F3F4F6' : 'none',
                    borderLeft: `3px solid ${mt.dot}`, cursor: 'pointer', transition: 'background 0.1s',
                    animation: `subRowIn 0.28s cubic-bezier(0.22,0.61,0.36,1) ${idx * 55}ms both`,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <span />
                    <div style={{ padding: '11px 12px 11px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: mt.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: mt.text }}>{alert.name}</span>
                        {alert.is_critical && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>CRITICAL</span>
                        )}
                      </div>
                      {alert.assigned_to && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, paddingLeft: 13 }}>{alert.assigned_to}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', padding: '11px 4px' }}>{fmtDate(alert.due_date)}</div>
                    <div style={{ padding: '11px 4px' }}><OverdueBadge days={alert.overdue_days} status={alert.status} /></div>
                    <div style={{ padding: '11px 0', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: mt.bg, color: mt.text, border: `1px solid ${mt.border}` }}>
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
      <tr aria-hidden><td colSpan={7} style={{ padding: 0, height: 10, border: 'none', background: 'transparent' }} /></tr>
    </>
  );
}

// ── Sort dropdown ──────────────────────────────────────────────────────────────
type SortKey = 'due_date' | 'overdue_days' | 'consignee' | 'alert_count';

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const opts: { label: string; value: SortKey }[] = [
    { label: 'Due date (earliest first)',   value: 'due_date'    },
    { label: 'Most overdue first',          value: 'overdue_days' },
    { label: 'Client name A–Z',             value: 'consignee'   },
    { label: 'Most alerts first',           value: 'alert_count' },
  ];

  const current = opts.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 8,
          border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
      >
        Sort: {current?.label}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 210, overflow: 'hidden',
        }}>
          {opts.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 14px',
                fontSize: 12, fontWeight: value === opt.value ? 600 : 400,
                color: value === opt.value ? '#2563EB' : '#374151',
                background: value === opt.value ? '#EFF6FF' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'block',
              }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Field-delayed yellow card + row (data not arrived / possibly renamed) ──────
function FDBody({ fd }: { fd: FDItem }) {
  return (
    <span style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
      Expected field <strong style={{ fontFamily: 'monospace', color: '#92400E' }}>{fd.expected_field || '—'}</strong> hasn&apos;t arrived
      {fd.suggested_field
        ? <> — likely came as <strong style={{ fontFamily: 'monospace', color: '#1D4ED8' }}>{fd.suggested_field}</strong>{fd.score != null && <span style={{ color: '#B45309' }}> ({Math.round(fd.score * 100)}%)</span>}.</>
        : <> — check for another name.</>}
    </span>
  );
}

function FDCard({ fd, onMap }: { fd: FDItem; onMap: () => void }) {
  return (
    <div style={{ background: C.amber.bg, border: `1px solid ${C.amber.border}`, borderTop: `4px solid ${C.amber.dot}`, borderRadius: 12, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 130 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: C.amber.text, background: '#fff', border: `1px solid ${C.amber.border}`, padding: '2px 8px', borderRadius: 6 }}>{fd.job_number || fd.shipment_id?.slice(0, 8)}</span>
        {fd.is_critical && <span style={{ fontSize: 9, fontWeight: 800, color: '#B91C1C', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: 4 }}>CRITICAL</span>}
        <span style={{ fontSize: 9, fontWeight: 800, color: C.amber.text, background: '#fff', border: `1px solid ${C.amber.border}`, padding: '1px 6px', borderRadius: 4 }}>FIELD MISMATCH</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fd.milestone_name}</div>
      <FDBody fd={fd} />
      <button onClick={onMap} style={{ marginTop: 'auto', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#1D4ED8', border: '1px solid #BFDBFE', fontFamily: 'inherit' }}>
        Map in Field Registry <ArrowRight size={12} />
      </button>
    </div>
  );
}

function FDRow({ fd, onMap }: { fd: FDItem; onMap: () => void }) {
  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
      <td colSpan={7} style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FFFBEB', borderLeft: `4px solid ${C.amber.dot}` }}>
          <span style={{ width: 150, flexShrink: 0, fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: C.amber.text, background: C.amber.bg, border: `1px solid ${C.amber.border}`, padding: '4px 10px', borderRadius: 6, textAlign: 'center' }}>{fd.job_number || fd.shipment_id?.slice(0, 8)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fd.milestone_name}</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: C.amber.text, background: '#fff', border: `1px solid ${C.amber.border}`, padding: '1px 6px', borderRadius: 4 }}>FIELD MISMATCH</span>
              {fd.is_critical && <span style={{ fontSize: 9, fontWeight: 800, color: '#B91C1C', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: 4 }}>CRITICAL</span>}
            </div>
            <div style={{ marginTop: 2 }}><FDBody fd={fd} /></div>
          </div>
          <button onClick={onMap} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#1D4ED8', border: '1px solid #BFDBFE', fontFamily: 'inherit' }}>
            Map in Field Registry <ArrowRight size={11} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AlertFeedTable({
  title   = 'Alert Feed',
  apiBase = 'http://127.0.0.1:5000',
  maxRows = 8,
  showFieldDelayed = false,
}: Props) {
  const router = useRouter();
  const [groups,    setGroups]    = useState<ShipmentAlertGroup[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [showAll,   setShowAll]   = useState(false);
  const [emailData, setEmailData] = useState<AlertData | null>(null);
  const [shipmentModalId, setShipmentModalId] = useState<string | null>(null);
  const [milestoneDetail, setMilestoneDetail] = useState<{ milestone: any; shipment: any } | null>(null);
  const [popupGroup, setPopupGroup] = useState<ShipmentAlertGroup | null>(null);
  const [fieldDelayed, setFieldDelayed] = useState<FDItem[]>([]);

  // ── Popup (card click) ──────────────────────────────────────
  

  // ── View: table or cards — default cards, remembered ───────
  const [view, setView] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('alertFeedView') as 'table' | 'cards') ?? 'cards';
    }
    return 'cards';
  });

  const switchView = (v: 'table' | 'cards') => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('alertFeedView', v);
  };

  // ── Search ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Filter: status ──────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'overdue'>('all');

  // ── Sort ────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('overdue_days');

  const fetchAlerts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/api/alerts/active`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setGroups(data.data ?? []);
      if (showFieldDelayed) {
        try {
          const fr = await fetch(`${apiBase}/api/field-watch/alerts`);
          const fd = await fr.json();
          setFieldDelayed(fd.data ?? []);
        } catch { /* non-fatal */ }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [apiBase, showFieldDelayed]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // ── Apply search + filter + sort ────────────────────────────
  const processed = groups
    .filter(g => {
      const q = search.toLowerCase();
      const matchSearch = !q || g.consignee_name.toLowerCase().includes(q) || g.job_number.toLowerCase().includes(q);
      const matchStatus =
        filterStatus === 'all'      ? true :
        filterStatus === 'critical' ? g.has_critical :
        filterStatus === 'overdue'  ? g.overdue_days_max > 0 :
        true;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortKey === 'due_date')     return (a.alerts[0]?.due_date ?? '9999') < (b.alerts[0]?.due_date ?? '9999') ? -1 : 1;
      if (sortKey === 'overdue_days') return b.overdue_days_max - a.overdue_days_max;
      if (sortKey === 'consignee')    return (a.consignee_name ?? '').localeCompare(b.consignee_name ?? '');
      if (sortKey === 'alert_count')  return b.alert_count - a.alert_count;
      return 0;
    });

  const displayed = showAll ? processed : processed.slice(0, maxRows);

  const fdShown: FDItem[] = showFieldDelayed
    ? fieldDelayed.filter(f => {
        const q = search.toLowerCase();
        return !q || (f.consignee_name || '').toLowerCase().includes(q) || (f.job_number || '').toLowerCase().includes(q);
      })
    : [];
  const mapToRegistry = () => router.push('/admin/field_registry');
  const redCount  = groups.filter(g => g.has_overdue ?? isUrgent(g)).length;   // overdue (dark red)
  const orgCount  = groups.length - redCount;                                   // delayed (lighter red)

  const TH: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn   { from{transform:scale(0.96);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes panelOpen { from{max-height:0;opacity:0} to{max-height:600px;opacity:1} }
        @keyframes panelClose{ from{max-height:600px;opacity:1} to{max-height:0;opacity:0} }
        @keyframes subRowIn  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes cardIn    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #F3F4F6',
          borderRadius: '14px 14px 0 0', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h2>
            {!loading && groups.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {redCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                    {redCount} overdue
                  </span>
                )}
                {orgCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FFF1F2', color: '#E11D48', border: '1px solid #FECDD3' }}>
                    {orgCount} delayed
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

        {/* ── Shared Toolbar ──────────────────────────────────── */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: '#FAFAFA',
        }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
            padding: '6px 12px', flex: 1, minWidth: 180,
          }}>
            <Search size={13} color="#9CA3AF" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client or shipment ID..."
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 12, color: '#374151', fontFamily: 'inherit', width: '100%',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([['all', 'All'], ['critical', '⚠ Critical'], ['overdue', 'Overdue']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterStatus(val)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 7,
                  border: `1px solid ${filterStatus === val ? (val === 'critical' ? '#FECACA' : val === 'overdue' ? '#FDE68A' : '#BFDBFE') : '#E5E7EB'}`,
                  background: filterStatus === val ? (val === 'critical' ? '#FEE2E2' : val === 'overdue' ? '#FEF3C7' : '#EFF6FF') : '#fff',
                  color: filterStatus === val ? (val === 'critical' ? '#B91C1C' : val === 'overdue' ? '#92400E' : '#2563EB') : '#6B7280',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <SortDropdown value={sortKey} onChange={setSortKey} />

          {/* View toggle */}
          <div style={{
            display: 'flex', border: '1px solid #E5E7EB', borderRadius: 8,
            overflow: 'hidden', marginLeft: 'auto', flexShrink: 0,
          }}>
            {([['cards', LayoutGrid], ['table', List]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                style={{
                  padding: '7px 12px', border: 'none', cursor: 'pointer',
                  background: view === v ? '#EFF6FF' : '#fff',
                  color: view === v ? '#2563EB' : '#6B7280',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: view === v ? 600 : 400,
                  fontFamily: 'inherit', transition: 'all 0.12s',
                  borderRight: v === 'cards' ? '1px solid #E5E7EB' : 'none',
                }}
              >
                <Icon size={14} />
                {v === 'cards' ? 'Cards' : 'Table'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #E5E7EB', borderTopColor: '#DC2626', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>Loading alerts...</span>
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#DC2626', fontSize: 13 }}>⚠ {error}</div>
        ) : processed.length === 0 && fdShown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✓</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#16A34A' }}>
                {search || filterStatus !== 'all' ? 'No results match your filters' : 'All clear'}
              </span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                {search || filterStatus !== 'all' ? 'Try adjusting your search or filter' : 'No overdue milestones at this time'}
              </span>
            </div>
          </div>
        ) : view === 'cards' ? (
          /* ── Card grid ── */
          <div style={{
            padding: '20px',
            display: 'grid',
            // Responsive: fills space, each card at least 280px wide
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {/* Progress alerts first (overdue / delayed), field-name mismatches after. */}
            {displayed.map((group, idx) => (
              <div key={group.shipment_id} style={{ animation: `cardIn 0.25s ease ${idx * 40}ms both` }}>
                <AlertCard group={group} onClick={() => setPopupGroup(group)} />
              </div>
            ))}
            {fdShown.map(fd => (
              <div key={`fd-${fd.id}`}><FDCard fd={fd} onMap={mapToRegistry} /></div>
            ))}
          </div>
        ) : (
          /* ── Table ── */
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
              {displayed.map(group => (
                <ShipmentAlertRow
                  key={group.shipment_id}
                  group={group}
                  onEmailClick={setEmailData}
                  onShipmentClick={setShipmentModalId}
                  onMilestoneClick={(milestoneId, shipmentId) => {
                    setShipmentModalId(shipmentId);
                  }}
                />
              ))}
              {fdShown.map(fd => (
                <FDRow key={`fd-${fd.id}`} fd={fd} onMap={mapToRegistry} />
              ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────── */}
        {!loading && processed.length > maxRows && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #F3F4F6', background: '#F9FAFB',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: '0 0 14px 14px',
          }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              Showing {displayed.length} of {processed.length} shipments
              {(search || filterStatus !== 'all') && ` (filtered from ${groups.length})`}
            </span>
            <button
              onClick={() => setShowAll(s => !s)}
              style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              {showAll ? 'Show less ↑' : `View all ${processed.length} →`}
            </button>
          </div>
        )}

        {/* ── Legend ──────────────────────────────────────────── */}
        {!loading && groups.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
              Overdue — past its deadline
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FB7185', display: 'inline-block' }} />
              Delayed — out of sequence
            </span>
            {showFieldDelayed && (
              <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                Field name mismatch
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Card click popup ────────────────────────────────────── */}
      {popupGroup && (
        <MilestonePopup
          group={popupGroup}
          onClose={() => setPopupGroup(null)}
          onEmailClick={setEmailData}
        />
      )}

      {/* ── Email modal ─────────────────────────────────────────── */}

        <ShipmentMilestonesModal
          isOpen={Boolean(shipmentModalId)}
          onClose={() => setShipmentModalId(null)}
          shipmentId={shipmentModalId}
          apiBase={apiBase}
          onMilestoneClick={(milestone, shipment) => {
            setMilestoneDetail({ milestone, shipment });
          }}
        />

        <MilestoneDetailModal
          isOpen={Boolean(milestoneDetail)}
          onClose={() => setMilestoneDetail(null)}
          milestone={milestoneDetail?.milestone ?? null}
          shipment={milestoneDetail?.shipment  ?? null}
        />
      
      <EmailComposeModal isOpen={Boolean(emailData)} onClose={() => setEmailData(null)} alertData={emailData} />
    </>
  );
}