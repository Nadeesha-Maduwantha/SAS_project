'use client';

// =============================================================
//  Step2_FieldLinking.jsx
//  Place at: components/milestones/MilestoneBuilder/Step2_FieldLinking.jsx
//
//  Step 2 of the MilestoneBuilder.
//  UI changes based on milestone_type selected in Step 1:
//    date       → primary field + expected date source
//    missing    → primary field only (the field that must not be empty)
//    comparison → field A / operator / field B or fixed value
//    document   → document name + tracking field
// =============================================================

import { Check } from 'lucide-react';
import FieldSelector, { FIELD_MAP, FIELD_CATEGORIES, getFieldLabel } from './FieldSelector';

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
};

const inp = {
  width:        '100%',
  padding:      '9px 12px',
  border:       `1px solid ${T.gray200}`,
  borderRadius: '8px',
  fontSize:     '13px',
  color:        T.gray900,
  background:   '#fff',
  outline:      'none',
  fontFamily:   T.font,
  boxSizing:    'border-box',
  transition:   'border-color 0.15s, box-shadow 0.15s',
};

const lbl = {
  display:       'block',
  fontSize:      '12px',
  fontWeight:    '600',
  color:         T.gray600,
  marginBottom:  '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

// Operators available per field type
const OPERATORS_BY_TYPE = {
  date:   [
    { value: 'missing',                  label: 'Is missing (null)'           },
    { value: 'more_than_x_days_before',  label: 'Is more than X days before'  },
    { value: 'more_than_x_days_after',   label: 'Is more than X days after'   },
    { value: 'same_as',                  label: 'Is the same date as'         },
    { value: 'not_same_as',              label: 'Is a different date from'     },
  ],
  number: [
    { value: 'greater_than',  label: 'Is greater than'  },
    { value: 'less_than',     label: 'Is less than'     },
    { value: 'equal_to',      label: 'Is equal to'      },
    { value: 'not_equal_to',  label: 'Is not equal to'  },
  ],
  text: [
    { value: 'equals',      label: 'Equals'              },
    { value: 'not_equals',  label: 'Does not equal'      },
    { value: 'contains',    label: 'Contains'            },
    { value: 'missing',     label: 'Is missing (empty)'  },
  ],
  status: [
    { value: 'equals',      label: 'Equals'              },
    { value: 'not_equals',  label: 'Does not equal'      },
    { value: 'contains',    label: 'Contains'            },
    { value: 'missing',     label: 'Is missing (empty)'  },
  ],
};

const DATE_SOURCE_OPTIONS = [
  {
    value:       'self',
    label:       'Use this field\'s own date',
    description: 'The due date IS the field value. Alert fires relative to when cargo_ready_date is set.',
  },
  {
    value:       'another_field',
    label:       'Calculate from another field',
    description: 'The due date is N days before/after another field. e.g. 3 days after cargo_received_date.',
  },
  {
    value:       'days_after_creation',
    label:       'N days after shipment is created',
    description: 'Due date is calculated as N days from when the shipment was added to SAS.',
  },
  {
    value:       'manual',
    label:       'Set manually when assigning template',
    description: 'Admin sets the exact due date when assigning this template to a shipment.',
  },
];

// ── Sub-view: Date type ───────────────────────────────────────────────────────
function DateLinking({ milestone, update, errors }) {
  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>
          Which field does this milestone watch? <span style={{ color: T.red }}>*</span>
        </label>
        <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
          This is the date field in the shipments table that this milestone tracks.
        </p>
        <FieldSelector
          value={milestone.primary_field}
          onChange={key => update('primary_field', key)}
          placeholder="Select a date field…"
          filter="date"
          error={errors.primary_field}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>
          How is the due date determined? <span style={{ color: T.red }}>*</span>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DATE_SOURCE_OPTIONS.map(opt => {
            const selected = milestone.expected_date_source === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('expected_date_source', opt.value)}
                style={{
                  textAlign:    'left',
                  padding:      '11px 14px',
                  borderRadius: '8px',
                  border:       `1.5px solid ${selected ? T.blue : T.gray200}`,
                  background:   selected ? T.blueBg : '#fff',
                  cursor:       'pointer',
                  fontFamily:   T.font,
                  transition:   'all 0.15s',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '600', color: selected ? T.blue : T.gray900, marginBottom: '2px' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '12px', color: T.gray500 }}>{opt.description}</div>
              </button>
            );
          })}
        </div>
        {errors.expected_date_source && (
          <p style={{ fontSize: '11px', color: T.red, marginTop: '6px' }}>{errors.expected_date_source}</p>
        )}
      </div>

      {/* Reference field — shown only when another_field is selected */}
      {milestone.expected_date_source === 'another_field' && (
        <div style={{ marginBottom: '20px', padding: '14px', background: T.gray50, borderRadius: '10px', border: `1px solid ${T.gray200}` }}>
          <label style={lbl}>
            Reference field <span style={{ color: T.red }}>*</span>
          </label>
          <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
            The due date will be calculated relative to this field.
          </p>
          <FieldSelector
            value={milestone.expected_date_field}
            onChange={key => update('expected_date_field', key)}
            placeholder="Select reference date field…"
            filter="date"
            error={errors.expected_date_field}
          />
          <div style={{ marginTop: '12px' }}>
            <label style={lbl}>Days offset</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                value={milestone.expected_date_offset}
                onChange={e => update('expected_date_offset', parseInt(e.target.value) || 0)}
                style={{ ...inp, width: '100px' }}
              />
              <span style={{ fontSize: '12px', color: T.gray500 }}>
                days {milestone.expected_date_offset >= 0 ? 'after' : 'before'} {getFieldLabel(milestone.expected_date_field) || 'reference field'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Days offset for days_after_creation */}
      {milestone.expected_date_source === 'days_after_creation' && (
        <div style={{ marginBottom: '20px', padding: '14px', background: T.gray50, borderRadius: '10px', border: `1px solid ${T.gray200}` }}>
          <label style={lbl}>Number of days after creation</label>
          <input
            type="number"
            min="1"
            value={milestone.expected_date_offset || 1}
            onChange={e => update('expected_date_offset', parseInt(e.target.value) || 1)}
            style={{ ...inp, width: '100px' }}
          />
          <p style={{ fontSize: '12px', color: T.gray500, marginTop: '6px' }}>
            e.g. 3 = due 3 days after the shipment is created in SAS.
          </p>
        </div>
      )}
    </>
  );
}

// ── Sub-view: Missing info type ───────────────────────────────────────────────
function MissingLinking({ milestone, update, errors }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={lbl}>
        Which field must not be empty? <span style={{ color: T.red }}>*</span>
      </label>
      <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
        The alert fires when this field has no value — it will keep firing until the field is filled in.
        Good for: consignee contact, consignee email, sales rep assignment, carrier.
      </p>
      <FieldSelector
        value={milestone.primary_field}
        onChange={key => update('primary_field', key)}
        placeholder="Select the required field…"
        filter="all"
        error={errors.primary_field}
      />
      {milestone.primary_field && (
        <div style={{ marginTop: '10px', padding: '10px 12px', background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: '8px', fontSize: '12px', color: '#1D4ED8', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <Check size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>Alert will fire when <strong>{getFieldLabel(milestone.primary_field)}</strong> is empty,
          and stop automatically once it has a value.</span>
        </div>
      )}
    </div>
  );
}

// ── Sub-view: Comparison type ─────────────────────────────────────────────────
function ComparisonLinking({ milestone, update, errors }) {
  const fieldAType = FIELD_MAP[milestone.field_a]?.type || 'text';
  const operators  = OPERATORS_BY_TYPE[fieldAType] || OPERATORS_BY_TYPE.text;
  const needsThreshold = ['more_than_x_days_before', 'more_than_x_days_after', 'greater_than', 'less_than', 'equal_to', 'not_equal_to'].includes(milestone.operator);
  const needsFieldB    = !['missing'].includes(milestone.operator);

  return (
    <>
      <p style={{ fontSize: '13px', color: T.gray500, marginBottom: '16px' }}>
        Build a comparison rule: alert when Field A meets a condition.
      </p>

      {/* Field A */}
      <div style={{ marginBottom: '16px' }}>
        <label style={lbl}>Field A <span style={{ color: T.red }}>*</span></label>
        <FieldSelector
          value={milestone.field_a}
          onChange={(key) => { update('field_a', key); update('operator', ''); }}
          placeholder="Select first field…"
          error={errors.field_a}
        />
      </div>

      {/* Operator */}
      {milestone.field_a && (
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>Condition <span style={{ color: T.red }}>*</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {operators.map(op => {
              const sel = milestone.operator === op.value;
              return (
                <button key={op.value} type="button"
                  onClick={() => update('operator', op.value)}
                  style={{
                    padding:      '7px 14px', borderRadius: '7px', fontSize: '12px',
                    fontWeight:   sel ? '700' : '500', fontFamily: T.font,
                    background:   sel ? T.blue : '#fff',
                    color:        sel ? '#fff' : T.gray700,
                    border:       `1px solid ${sel ? T.blue : T.gray200}`,
                    cursor:       'pointer', transition: 'all 0.12s',
                  }}>
                  {op.label}
                </button>
              );
            })}
          </div>
          {errors.operator && <p style={{ fontSize: '11px', color: T.red, marginTop: '4px' }}>{errors.operator}</p>}
        </div>
      )}

      {/* Threshold value (for > / < / equals operators) */}
      {milestone.operator && needsThreshold && (
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>Threshold value</label>
          <input
            type={fieldAType === 'number' ? 'number' : 'text'}
            value={milestone.threshold_value || ''}
            onChange={e => update('threshold_value', e.target.value)}
            placeholder={fieldAType === 'number' ? 'e.g. 3' : 'e.g. Delayed'}
            style={{ ...inp, width: '160px' }}
          />
        </div>
      )}

      {/* Field B or fixed value */}
      {milestone.operator && needsFieldB && (
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>Compare against</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', color: T.gray400, marginBottom: '6px' }}>Another field</p>
              <FieldSelector
                value={milestone.field_b}
                onChange={key => { update('field_b', key); update('fixed_value', ''); }}
                placeholder="Select field…"
              />
            </div>
            <div style={{ padding: '10px 8px', color: T.gray400, fontSize: '12px', fontWeight: '600', alignSelf: 'flex-end', marginBottom: '2px' }}>OR</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', color: T.gray400, marginBottom: '6px' }}>Fixed value</p>
              <input
                value={milestone.fixed_value || ''}
                onChange={e => { update('fixed_value', e.target.value); update('field_b', ''); }}
                placeholder='e.g. "Delayed" or "3"'
                style={inp}
              />
            </div>
          </div>
          {errors.field_b && <p style={{ fontSize: '11px', color: T.red, marginTop: '4px' }}>{errors.field_b}</p>}
        </div>
      )}
    </>
  );
}

// ── Sub-view: Document type ───────────────────────────────────────────────────
function DocumentLinking({ milestone, update, errors }) {
  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>Document name <span style={{ color: T.red }}>*</span></label>
        <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
          The name of the document that must be updated in CargoWise. This is shown in the alert email.
        </p>
        <input
          value={milestone.document_name}
          onChange={e => update('document_name', e.target.value)}
          placeholder='e.g. "Bill of Lading", "Export Declaration", "Packing List"'
          style={{ ...inp, borderColor: errors.document_name ? T.red : T.gray200 }}
          onFocus={e => { e.target.style.borderColor = T.blue; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e  => { e.target.style.borderColor = errors.document_name ? T.red : T.gray200; e.target.style.boxShadow = 'none'; }}
        />
        {errors.document_name && <p style={{ fontSize: '11px', color: T.red, marginTop: '4px' }}>{errors.document_name}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>
          Tracking field <span style={{ color: T.red }}>*</span>
        </label>
        <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
          Which field in the shipments table confirms this document has been uploaded?
          Usually one of the "last edited" timestamp fields.
        </p>
        <FieldSelector
          value={milestone.tracking_field}
          onChange={key => update('tracking_field', key)}
          placeholder="Select confirmation field…"
          filter="date"
          error={errors.tracking_field}
        />
      </div>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Step2_FieldLinking({ milestone, update, errors }) {
  const typeLabels = {
    date:       'Date Check',
    missing:    'Missing Info',
    comparison: 'Field Comparison',
    document:   'Document Check',
  };

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>
          Field Linking
        </h3>
        <p style={{ fontSize: '13px', color: T.gray500, margin: 0 }}>
          Connect this <strong>{typeLabels[milestone.milestone_type]}</strong> milestone
          to the shipment database fields it should monitor.
        </p>
      </div>

      {milestone.milestone_type === 'date'       && <DateLinking        milestone={milestone} update={update} errors={errors} />}
      {milestone.milestone_type === 'missing'    && <MissingLinking     milestone={milestone} update={update} errors={errors} />}
      {milestone.milestone_type === 'comparison' && <ComparisonLinking  milestone={milestone} update={update} errors={errors} />}
      {milestone.milestone_type === 'document'   && <DocumentLinking    milestone={milestone} update={update} errors={errors} />}
    </div>
  );
}