'use client';

// =============================================================
//  Step4_Preview.jsx
//  Place at: components/milestones/MilestoneBuilder/Step4_Preview.jsx
//
//  Step 4 of the MilestoneBuilder.
//  Read-only summary of everything configured in Steps 1–3.
//  User reviews before clicking Create / Save.
// =============================================================

import { getFieldLabel } from './FieldSelector';

const T = {
  font:       "'DM Sans', system-ui, sans-serif",
  gray900:    '#111827',
  gray700:    '#374151',
  gray600:    '#4B5563',
  gray500:    '#6B7280',
  gray400:    '#9CA3AF',
  gray200:    '#E5E7EB',
  gray100:    '#F3F4F6',
  gray50:     '#F9FAFB',
  blue:       '#2563EB',
  blueBg:     '#EFF6FF',
  blueBorder: '#BFDBFE',
  red:        '#DC2626',
  redBg:      '#FEF2F2',
  green:      '#16A34A',
  greenBg:    '#F0FDF4',
  greenBorder:'#BBF7D0',
  amber:      '#D97706',
  amberBg:    '#FFFBEB',
  amberBorder:'#FDE68A',
};

const TYPE_LABELS = {
  date:       { label: 'Date Check',        icon: '', color: T.blue,  bg: T.blueBg  },
  missing:    { label: 'Missing Info',       icon: '', color: T.amber, bg: T.amberBg },
  comparison: { label: 'Field Comparison',   icon: '', color: T.gray700, bg: T.gray100 },
  document:   { label: 'Document Check',     icon: '', color: T.green,  bg: T.greenBg },
};

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{
      border:       `1px solid ${T.gray200}`,
      borderRadius: '10px',
      overflow:     'hidden',
      marginBottom: '14px',
    }}>
      <div style={{
        padding:      '10px 14px',
        background:   T.gray50,
        borderBottom: `1px solid ${T.gray200}`,
        fontSize:     '12px',
        fontWeight:   '700',
        color:        T.gray600,
        textTransform:'uppercase',
        letterSpacing:'0.05em',
      }}>
        {title}
      </div>
      <div style={{ padding: '14px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Row inside a section ───────────────────────────────────────────────────────
function Row({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '12px', color: T.gray400, width: '160px', flexShrink: 0, paddingTop: '1px' }}>
        {label}
      </span>
      <span style={{
        fontSize:   '13px',
        fontWeight: '500',
        color:      T.gray900,
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  );
}

// ── Rule summary ───────────────────────────────────────────────────────────────
function RuleSummary({ rule, index }) {
  const timingText =
    rule.timing === 'before'  ? `${rule.days_offset} day(s) before at ${rule.fire_time}` :
    rule.timing === 'after'   ? `${rule.days_offset} day(s) after at ${rule.fire_time}` :
                                `On date at ${rule.fire_time}`;

  const conditionText =
    rule.condition === 'always'             ? 'Always — fires unconditionally' :
    rule.condition === 'if_not_recorded'    ? 'Only if primary field is still empty' :
    rule.condition === 'if_comparison_true' ? 'Only if comparison condition is still true' :
    rule.condition === 'if_missing'         ? 'Only if required field is still missing' :
    rule.condition;

  const recurrenceText =
    rule.recurrence_type === 'once'            ? 'Fires once only' :
    rule.recurrence_type === 'daily'           ? 'Repeats daily' :
    rule.recurrence_type === 'weekly'          ? 'Repeats weekly' :
    `Repeats every ${rule.recurrence_interval} day(s)`;

  const stopText =
    !rule.recurrence_type || rule.recurrence_type === 'once'
      ? null
    : rule.recurrence_end_type === 'after_n_times'
      ? `Stops after ${rule.recurrence_end_n} fire(s)`
    : rule.recurrence_end_type === 'on_date'
      ? `Stops on ${rule.recurrence_end_date}`
    : rule.recurrence_end_type === 'when_condition_met'
      ? `Stops when ${getFieldLabel(rule.stop_condition_field) || 'field'} ${rule.stop_condition_type === 'is_not_null' ? 'has a value' : rule.stop_condition_type}`
    : 'Never stops (manual cancel only)';

  const recipientText =
    rule.recipient_type === 'custom' ? `Custom: ${rule.custom_email}` :
    rule.recipient_type.charAt(0).toUpperCase() + rule.recipient_type.slice(1) + ' user';

  return (
    <div style={{
      padding:      '12px 14px',
      borderRadius: '8px',
      border:       `1px solid ${T.gray200}`,
      background:   '#fff',
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: T.blue, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: '700', flexShrink: 0,
        }}>
          {index + 1}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: T.gray900 }}>
          Rule {index + 1}
        </span>
      </div>
      <Row label="Fires"       value={timingText}    />
      <Row label="Condition"   value={conditionText} />
      <Row label="Recurrence"  value={recurrenceText}/>
      {stopText && <Row label="Stops"  value={stopText} />}
      <Row label="Recipient"   value={recipientText} />
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function Step4_Preview({ milestone }) {
  const typeMeta = TYPE_LABELS[milestone.milestone_type] || TYPE_LABELS.date;
  const rules    = milestone.alert_rules || [];

  return (
    <div style={{ fontFamily: T.font }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: T.gray900, margin: '0 0 4px' }}>
          Preview
        </h3>
        <p style={{ fontSize: '13px', color: T.gray500, margin: 0 }}>
          Review your milestone configuration before saving.
        </p>
      </div>

      {/* Milestone name + type banner */}
      <div style={{
        padding:      '16px 18px',
        borderRadius: '10px',
        background:   typeMeta.bg,
        border:       `1px solid ${T.gray200}`,
        marginBottom: '16px',
        display:      'flex',
        alignItems:   'center',
        gap:          '14px',
      }}>
        <span style={{ fontSize: '28px' }}>{typeMeta.icon}</span>
        <div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: T.gray900 }}>
            {milestone.name || <span style={{ color: T.gray400 }}>Unnamed milestone</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', background: '#fff', color: typeMeta.color, border: `1px solid ${T.gray200}` }}>
              {typeMeta.label}
            </span>
            {milestone.is_critical && (
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', background: T.redBg, color: T.red, border: `1px solid #FECACA` }}>
                Critical
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 1 — Basic info */}
      <Section title="Basic Info">
        <Row label="Name"        value={milestone.name}        />
        <Row label="Type"        value={typeMeta.label}        />
        <Row label="Critical"    value={milestone.is_critical ? 'Yes — highlighted in alert feed' : 'No'} />
        <Row label="Description" value={milestone.description} />
      </Section>

      {/* Section 2 — Field linking */}
      <Section title="Field Linking">
        {(milestone.milestone_type === 'date' || milestone.milestone_type === 'missing') && (
          <>
            <Row label="Watching field"   value={getFieldLabel(milestone.primary_field)} mono />
            {milestone.milestone_type === 'date' && (
              <>
                <Row label="Due date from"
                  value={
                    milestone.expected_date_source === 'self'                ? 'Field\'s own value'
                    : milestone.expected_date_source === 'another_field'     ? `${getFieldLabel(milestone.expected_date_field)} + ${milestone.expected_date_offset} day(s)`
                    : milestone.expected_date_source === 'days_after_creation' ? `${milestone.expected_date_offset} day(s) after shipment creation`
                    : 'Set manually at assignment'
                  }
                />
              </>
            )}
          </>
        )}
        {milestone.milestone_type === 'comparison' && (
          <>
            <Row label="Field A"   value={getFieldLabel(milestone.field_a)} mono />
            <Row label="Operator"  value={milestone.operator} />
            <Row label="Field B"   value={milestone.field_b ? getFieldLabel(milestone.field_b) : milestone.fixed_value} mono={!!milestone.field_b} />
            {milestone.threshold_value && <Row label="Threshold" value={milestone.threshold_value} />}
          </>
        )}
        {milestone.milestone_type === 'document' && (
          <>
            <Row label="Document name"    value={milestone.document_name}                        />
            <Row label="Confirmed when"   value={getFieldLabel(milestone.tracking_field)} mono   />
          </>
        )}
      </Section>

      {/* Section 3 — Alert rules */}
      <Section title={`Alert Rules (${rules.length})`}>
        {rules.length === 0 ? (
          <p style={{ fontSize: '13px', color: T.red }}>No alert rules configured.</p>
        ) : (
          rules.map((rule, i) => <RuleSummary key={i} rule={rule} index={i} />)
        )}
      </Section>

      {/* Ready banner */}
      {rules.length > 0 && milestone.name && milestone.primary_field && (
        <div style={{
          padding:      '12px 16px',
          borderRadius: '8px',
          background:   T.greenBg,
          border:       `1px solid ${T.greenBorder}`,
          fontSize:     '13px',
          color:        T.green,
          fontWeight:   '600',
          display:      'flex',
          alignItems:   'center',
          gap:          '8px',
        }}>
          This milestone is ready to save. It will appear in the milestone library and can be added to any template.
        </div>
      )}
    </div>
  );
}