'use client';

import { useState } from 'react';
import { X, Mail, MapPin, Calendar, CheckCircle2, User, AlertTriangle } from 'lucide-react';
import EmailComposeModal from '@/components/EmailComposeModal';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Milestone {
  id:                string;
  sequence_order:    number;
  name:              string;
  status:            string;
  is_critical:       boolean;
  automated:         boolean;
  due_date:          string | null;
  completed_date:    string | null;
  notes:             string | null;
  assigned_to:       string | null;
  assigned_email:    string | null;
  location_label:    string | null;
  location_lat:      number | null;
  location_lng:      number | null;
  days_from_booking: number | null;
}

interface Shipment {
  id:                string;
  job_number:        string;
  consignee_name:    string;
  transport_mode:    string;
  created_by_name:   string | null;
  created_by_email:  string | null;
  consignee_email:   string | null;
  carrier:           string | null;
  origin_city:       string | null;
  destination_city:  string | null;
}

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  milestone: Milestone | null;
  shipment:  Shipment  | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  completed: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  overdue:   { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', dot: '#EF4444' },
  pending:   { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF' },
  current:   { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
};

function getStatusStyle(status: string) {
  return STATUS_STYLE[status?.toLowerCase()] || STATUS_STYLE.pending;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MilestoneDetailModal({ isOpen, onClose, milestone, shipment }: Props) {
  const [emailData, setEmailData] = useState<any>(null);

  if (!isOpen || !milestone) return null;

  const ms = getStatusStyle(milestone.status);

  const buildEmailData = () => ({
    id:            shipment?.job_number || '',
    shipment_id:   shipment?.id || '',
    client:        shipment?.consignee_name || '',
    priority:      milestone.is_critical ? 'Critical' : 'Medium',
    milestone:     milestone.name,
    milestoneIcon: null,
    issue:         milestone.notes || `Milestone "${milestone.name}" requires attention.`,
    delay:         milestone.due_date ? fmtDate(milestone.due_date) : '—',
    delayColor:    milestone.status === 'overdue' ? '#DC2626' : '#D97706',
    status:        'Get Action' as const,
  });

  return (
    <>
      <style>{`
        @keyframes mdModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Backdrop — higher z-index than ShipmentMilestonesModal */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 580,
            background: '#fff', borderRadius: 16,
            boxShadow: '0 32px 64px rgba(0,0,0,0.25)',
            animation: 'mdModalIn 0.22s cubic-bezier(0.22,0.61,0.36,1)',
            overflow: 'hidden',
            maxHeight: '88vh',
            display: 'flex', flexDirection: 'column',
          }}
        >

          {/* ── Header ─────────────────────────────────────── */}
          <div style={{
            padding: '18px 22px',
            background: milestone.is_critical ? '#FFF1F2' : ms.bg,
            borderBottom: `1px solid ${ms.border}`,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              {/* Milestone number + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: ms.dot, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>
                  {milestone.sequence_order + 1}
                </span>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {milestone.name}
                </h2>
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                  background: ms.bg, color: ms.text, border: `1px solid ${ms.border}`,
                }}>
                  {milestone.status}
                </span>
                {milestone.is_critical && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                    background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA',
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>
                    <AlertTriangle size={9} /> CRITICAL
                  </span>
                )}
                {milestone.automated && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                    Auto-updated
                  </span>
                )}
                {/* Shipment reference */}
                {shipment && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99,
                    background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                    fontFamily: 'monospace',
                  }}>
                    #{shipment.job_number}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid #E5E7EB', background: 'rgba(255,255,255,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#6B7280', flexShrink: 0,
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Body ───────────────────────────────────────── */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '20px 22px' }}>

            {/* Date + info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { icon: <Calendar size={13} color="#6B7280" />, label: 'Expected Date',     value: fmtDate(milestone.due_date)        },
                { icon: <CheckCircle2 size={13} color="#10B981" />, label: 'Completed At',  value: fmtDate(milestone.completed_date)  },
                { icon: <User size={13} color="#6B7280" />,    label: 'Assigned To',        value: milestone.assigned_to  || '—'      },
                { icon: <span style={{ fontSize: 12 }}>📅</span>, label: 'Days from Booking', value: milestone.days_from_booking != null ? `Day ${milestone.days_from_booking}` : '—' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '11px 13px', background: '#F9FAFB',
                  border: '1px solid #F3F4F6', borderRadius: 9,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    {item.icon}
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Location */}
            {milestone.location_label && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '11px 14px', background: '#F0F9FF',
                border: '1px solid #BAE6FD', borderRadius: 9, marginBottom: 14,
              }}>
                <MapPin size={15} color="#0369A1" />
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Location</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0C4A6E', margin: 0 }}>
                    {milestone.location_label}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {milestone.notes && (
              <div style={{
                padding: '12px 14px', background: '#FFFBEB',
                border: '1px solid #FDE68A', borderRadius: 9, marginBottom: 16,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                  Notes
                </p>
                <p style={{ fontSize: 13, color: '#78350F', margin: 0, lineHeight: 1.65 }}>
                  {milestone.notes}
                </p>
              </div>
            )}

            {/* Responsible parties */}
            {shipment && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  Responsible Parties
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 9 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Created By</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', margin: '0 0 2px' }}>{shipment.created_by_name || '—'}</p>
                    <p style={{ fontSize: 11, color: '#3B82F6', margin: 0 }}>{shipment.created_by_email || '—'}</p>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 9 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Consignee</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{shipment.consignee_name || '—'}</p>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{shipment.consignee_email || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────── */}
          {milestone.status !== 'completed' && (
            <div style={{
              padding: '14px 22px', borderTop: '1px solid #F3F4F6',
              background: '#FAFAFA', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                This milestone requires action
              </p>
              <button
                onClick={() => setEmailData(buildEmailData())}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  background: milestone.is_critical ? '#DC2626' : '#1D4ED8',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.87')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <Mail size={14} />
                {milestone.is_critical ? 'Urgent — Send Alert' : 'Send Alert'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Email modal — z-index 1200, above everything */}
      <EmailComposeModal
        isOpen={Boolean(emailData)}
        onClose={() => setEmailData(null)}
        alertData={emailData}
      />
    </>
  );
}