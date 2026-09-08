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

import { useState, useEffect } from 'react';
import { Check, Settings2 } from 'lucide-react';
import FieldSelector, { FIELD_MAP, FIELD_CATEGORIES, getFieldLabel } from './FieldSelector';

// Documents in CargoWise stamp this "last edited" timestamp, so it's the
// sensible default confirmation field for a Document Check milestone.
const DEFAULT_TRACKING_FIELD = 'job_docs_last_edit_time';

const T = {
  font:       "'DM Sans', system-ui, sans-serif",
  gray900:    'var(--gray-900)',
  gray700:    'var(--gray-700)',
  gray600:    'var(--gray-600)',
  gray500:    'var(--gray-500)',
  gray400:    'var(--gray-400)',
  gray200:    'var(--gray-200)',
  gray100:    'var(--gray-100)',
  gray50:     'var(--gray-50)',
  blue:       'var(--blue)',
  blueBg:     'var(--blue-bg)',
  blueBorder: 'var(--blue-border)',
  red:        'var(--red)',
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

const DUE_BASIS_OPTIONS = [
  {
    value:       'another_field',
    label:       "Start from a field's date",
    description: 'Due on (or N days after) another date field — e.g. Cargo Pickup Date + 3 days.',
  },
  {
    value:       'days_after_creation',
    label:       'N days after shipment is created',
    description: 'Due N days from when the shipment was added to SAS.',
  },
  {
    value:       'after_previous_milestone',
    label:       'After the previous milestone ends',
    description: 'Due once the milestone before this one is completed, optionally + N days.',
  },
  {
    value:       'manual',
    label:       'Set manually when assigning',
    description: 'Admin sets the exact due date when assigning the template to a shipment.',
  },
];

// Reusable "when is this milestone due?" selector. Writes to
// expected_date_source / expected_date_field / expected_date_offset so every
// milestone type gets a deadline the alert engine can time rules against.
function DueDateBasis({ milestone, update, errors }) {
  const options = DUE_BASIS_OPTIONS;
  const source = milestone.expected_date_source;

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={lbl}>
        When is this milestone due? <span style={{ color: T.red }}>*</span>
      </label>
      <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
        Sets the milestone's deadline — alert rules fire relative to this.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map(opt => {
          const selected = source === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.description}
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

      {/* Reference field + offset — for 'another_field' */}
      {source === 'another_field' && (
        <div style={{ marginTop: '12px', padding: '14px', background: T.gray50, borderRadius: '10px', border: `1px solid ${T.gray200}` }}>
          <label style={lbl}>Reference field <span style={{ color: T.red }}>*</span></label>
          <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
            The due date is calculated relative to this field's date.
          </p>
          <FieldSelector
            value={milestone.expected_date_field}
            onChange={key => update('expected_date_field', key)}
            placeholder="Select date field… e.g. Cargo Pickup Date"
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
                days {milestone.expected_date_offset >= 0 ? 'after' : 'before'} {getFieldLabel(milestone.expected_date_field) || 'reference field'} (0 = on that date)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Days after creation */}
      {source === 'days_after_creation' && (
        <div style={{ marginTop: '12px', padding: '14px', background: T.gray50, borderRadius: '10px', border: `1px solid ${T.gray200}` }}>
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

      {/* Days after previous milestone completes */}
      {source === 'after_previous_milestone' && (
        <div style={{ marginTop: '12px', padding: '14px', background: T.gray50, borderRadius: '10px', border: `1px solid ${T.gray200}` }}>
          <label style={lbl}>Days after previous milestone completes</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              min="0"
              value={milestone.expected_date_offset || 0}
              onChange={e => update('expected_date_offset', parseInt(e.target.value) || 0)}
              style={{ ...inp, width: '100px' }}
            />
            <span style={{ fontSize: '12px', color: T.gray500 }}>
              days after the milestone above this one is completed (0 = immediately).
            </span>
          </div>
          <p style={{ fontSize: '11px', color: T.gray400, marginTop: '6px' }}>
            Uses the previous milestone in the template's order.
          </p>
        </div>
      )}
    </div>
  );
}

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

      <DueDateBasis milestone={milestone} update={update} errors={errors} />
    </>
  );
}

// ── Sub-view: Missing info type ───────────────────────────────────────────────
function MissingLinking({ milestone, update, errors }) {
  return (
    <>
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
    <DueDateBasis milestone={milestone} update={update} errors={errors} />
    </>
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
      <DueDateBasis milestone={milestone} update={update} errors={errors} />
    </>
  );
}

// ── Sub-view: Document type ───────────────────────────────────────────────────
function DocumentLinking({ milestone, update, errors }) {
  // Pre-select the default confirmation field for new document milestones.
  useEffect(() => {
    if (!milestone.tracking_field) update('tracking_field', DEFAULT_TRACKING_FIELD);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advanced mode opens the full field picker. Auto-open if a non-default field
  // was already chosen (e.g. editing an existing milestone).
  const [advanced, setAdvanced] = useState(
    !!milestone.tracking_field && milestone.tracking_field !== DEFAULT_TRACKING_FIELD
  );

  const current = milestone.tracking_field || DEFAULT_TRACKING_FIELD;

  const linkBtn = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    color: T.blue, fontSize: '12px', fontWeight: '600', fontFamily: T.font,
    display: 'inline-flex', alignItems: 'center', gap: '5px',
  };

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
          The field that confirms this document has been uploaded. By default we watch when
          job documents were last updated in CargoWise — change it only if this document is
          confirmed by a different field.
        </p>

        {!advanced ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            padding: '12px 14px', border: `1px solid ${T.gray200}`, borderRadius: '10px', background: T.gray50,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
              <Check size={15} color={T.blue} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: T.gray900 }}>{getFieldLabel(current)}</span>
                  <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.04em', color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBorder}`, padding: '1px 6px', borderRadius: '4px' }}>DEFAULT</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: T.gray400 }}>{current}</div>
              </div>
            </div>
            <button type="button" onClick={() => setAdvanced(true)} style={{ ...linkBtn, flexShrink: 0 }}>
              <Settings2 size={13} /> Use a different field
            </button>
          </div>
        ) : (
          <>
            <FieldSelector
              value={milestone.tracking_field}
              onChange={key => update('tracking_field', key)}
              placeholder="Select confirmation field…"
              filter="date"
              error={errors.tracking_field}
            />
            <button
              type="button"
              onClick={() => { update('tracking_field', DEFAULT_TRACKING_FIELD); setAdvanced(false); }}
              style={{ ...linkBtn, marginTop: '8px' }}
            >
              Reset to default (job documents)
            </button>
          </>
        )}
        {errors.tracking_field && <p style={{ fontSize: '11px', color: T.red, marginTop: '4px' }}>{errors.tracking_field}</p>}
      </div>

      <DueDateBasis milestone={milestone} update={update} errors={errors} />
    </>
  );
}

// ── Sub-view: Status type ─────────────────────────────────────────────────────
// A simplified comparison: watch a status field, alert while it is / is not a
// value. Stored as field_a + operator + fixed_value so the engine evaluates it
// exactly like a Field Comparison.
function StatusLinking({ milestone, update, errors }) {
  // Default the operator so a fresh status milestone starts on "is".
  useEffect(() => {
    if (!milestone.operator) update('operator', 'equals');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const op = milestone.operator || 'equals';

  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>Which status field? <span style={{ color: T.red }}>*</span></label>
        <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
          The status field to watch — e.g. Pickup Status, Current Stage, Transport Mode.
        </p>
        <FieldSelector
          value={milestone.field_a}
          onChange={key => update('field_a', key)}
          placeholder="Select a status field…"
          filter="status"
          error={errors.field_a}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>Alert while it <span style={{ color: T.red }}>*</span></label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {[{ v: 'equals', l: 'is' }, { v: 'not_equals', l: 'is not' }].map(o => {
            const sel = op === o.v;
            return (
              <button key={o.v} type="button" onClick={() => update('operator', o.v)}
                style={{
                  padding: '7px 18px', borderRadius: '7px', fontSize: '13px',
                  fontWeight: sel ? '700' : '500', fontFamily: T.font,
                  background: sel ? T.blue : '#fff', color: sel ? '#fff' : T.gray700,
                  border: `1px solid ${sel ? T.blue : T.gray200}`, cursor: 'pointer', transition: 'all 0.12s',
                }}>
                {o.l}
              </button>
            );
          })}
        </div>
        <input
          value={milestone.fixed_value || ''}
          onChange={e => update('fixed_value', e.target.value)}
          placeholder='Status value — e.g. "Delayed"'
          style={{ ...inp, borderColor: errors.fixed_value ? T.red : T.gray200 }}
        />
        {errors.fixed_value && <p style={{ fontSize: '11px', color: T.red, marginTop: '4px' }}>{errors.fixed_value}</p>}

        {milestone.field_a && (milestone.fixed_value || '').trim() && (
          <div style={{ marginTop: '10px', padding: '10px 12px', background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: '8px', fontSize: '12px', color: '#1D4ED8', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <Check size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>Alert fires while <strong>{getFieldLabel(milestone.field_a)}</strong> {op === 'not_equals' ? 'is not' : 'is'} <strong>"{milestone.fixed_value}"</strong>.</span>
          </div>
        )}
      </div>

      <DueDateBasis milestone={milestone} update={update} errors={errors} />
    </>
  );
}

// ── Additional logic blocks ───────────────────────────────────────────────────
// A milestone can combine several checks (e.g. date updated AND status = X).
// The primary check is the milestone_type above; these extra blocks live in
// milestone.extra_logics and combine via milestone.logic_combine ('and'|'or').
const LOGIC_BLOCK_TYPES = [
  { value: 'date',       label: 'Date updated'   },
  { value: 'status',     label: 'Status is'      },
  { value: 'missing',    label: 'Field missing'  },
  { value: 'comparison', label: 'Comparison'     },
  { value: 'document',   label: 'Document check' },
];

function LogicBlockEditor({ block, index, checkNo, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...block, [k]: v });
  const opType = FIELD_MAP[block.field_a]?.type || 'text';
  const ops = OPERATORS_BY_TYPE[opType] || OPERATORS_BY_TYPE.text;
  const needsThreshold = ['more_than_x_days_before', 'more_than_x_days_after', 'greater_than', 'less_than', 'equal_to', 'not_equal_to'].includes(block.operator);
  const docField = block.tracking_field || 'job_docs_last_edit_time';
  const [docAdvanced, setDocAdvanced] = useState(!!block.tracking_field && block.tracking_field !== 'job_docs_last_edit_time');

  const blkLbl = { display: 'block', fontSize: '11px', fontWeight: '600', color: T.gray600, marginBottom: '5px' };

  const miniBtn = (sel) => ({
    padding: '6px 12px', borderRadius: '7px', fontSize: '12px',
    fontWeight: sel ? '700' : '500', fontFamily: T.font,
    background: sel ? T.blue : '#fff', color: sel ? '#fff' : T.gray700,
    border: `1px solid ${sel ? T.blue : T.gray200}`, cursor: 'pointer',
  });

  return (
    <div style={{ border: `1px solid ${T.gray200}`, borderRadius: '10px', padding: '14px', marginBottom: '10px', background: T.gray50 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: T.gray400 }}>CHECK {checkNo}</span>
          <select
            value={block.type}
            onChange={e => {
              const t = e.target.value;
              const nb = { type: t };
              if (t === 'status')   nb.operator = 'equals';
              if (t === 'document') nb.tracking_field = 'job_docs_last_edit_time';
              onChange(nb);
              setDocAdvanced(false);
            }}
            style={{ ...inp, width: 'auto', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
          >
            {LOGIC_BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, fontSize: '12px', fontWeight: '600', fontFamily: T.font }}>Remove</button>
      </div>

      {(block.type === 'date' || block.type === 'missing') && (
        <>
          <label style={blkLbl}>{block.type === 'date' ? 'Date field that must be updated' : 'Field that must not be empty'}</label>
          <FieldSelector
            value={block.primary_field}
            onChange={key => set('primary_field', key)}
            placeholder={block.type === 'date' ? 'Select a date field…' : 'Select the required field…'}
            filter={block.type === 'date' ? 'date' : 'all'}
          />
          <p style={{ fontSize: '11px', color: T.gray400, marginTop: '6px' }}>
            {block.type === 'date' ? 'Passes once this date field has a value.' : 'Passes once this field is filled in.'}
          </p>
        </>
      )}

      {block.type === 'status' && (
        <>
          <label style={blkLbl}>Status field</label>
          <FieldSelector value={block.field_a} onChange={key => set('field_a', key)} placeholder="Select a status field…" filter="status" />
          <label style={{ ...blkLbl, marginTop: '10px' }}>Alert while it</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {[{ v: 'equals', l: 'is' }, { v: 'not_equals', l: 'is not' }].map(o => (
              <button key={o.v} type="button" onClick={() => set('operator', o.v)} style={miniBtn((block.operator || 'equals') === o.v)}>{o.l}</button>
            ))}
          </div>
          <input value={block.fixed_value || ''} onChange={e => set('fixed_value', e.target.value)} placeholder='Value e.g. "Delayed"' style={inp} />
        </>
      )}

      {block.type === 'comparison' && (
        <>
          <label style={blkLbl}>Field A</label>
          <FieldSelector value={block.field_a} onChange={key => onChange({ ...block, field_a: key, operator: '' })} placeholder="Select first field…" />
          {block.field_a && (
            <>
              <label style={{ ...blkLbl, marginTop: '10px' }}>Condition</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {ops.map(op => (
                  <button key={op.value} type="button" onClick={() => set('operator', op.value)} style={{ ...miniBtn(block.operator === op.value), padding: '5px 11px', fontSize: '11px' }}>{op.label}</button>
                ))}
              </div>
            </>
          )}
          {block.operator && needsThreshold && (
            <input
              type={opType === 'number' ? 'number' : 'text'}
              value={block.threshold_value || ''}
              onChange={e => set('threshold_value', e.target.value)}
              placeholder={opType === 'number' ? 'Threshold e.g. 3' : 'Threshold e.g. Delayed'}
              style={{ ...inp, width: '160px', marginBottom: '8px' }}
            />
          )}
          {block.operator && block.operator !== 'missing' && (
            <>
              <label style={blkLbl}>Compare against</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <FieldSelector value={block.field_b} onChange={key => onChange({ ...block, field_b: key, fixed_value: '' })} placeholder="Another field…" />
                <span style={{ fontSize: '11px', color: T.gray400 }}>or</span>
                <input value={block.fixed_value || ''} onChange={e => onChange({ ...block, fixed_value: e.target.value, field_b: '' })} placeholder="fixed value" style={inp} />
              </div>
            </>
          )}
        </>
      )}

      {block.type === 'document' && (
        <>
          <label style={blkLbl}>Document name</label>
          <input value={block.document_name || ''} onChange={e => set('document_name', e.target.value)} placeholder='e.g. "Bill of Lading"' style={{ ...inp, marginBottom: '10px' }} />
          <label style={blkLbl}>Confirmation field</label>
          {!docAdvanced ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', border: `1px solid ${T.gray200}`, borderRadius: '8px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <Check size={14} color={T.blue} style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: T.gray900 }}>{getFieldLabel(docField)}</span>
                    <span style={{ fontSize: '8px', fontWeight: '700', color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBorder}`, padding: '1px 5px', borderRadius: '4px' }}>DEFAULT</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: T.gray400 }}>{docField}</div>
                </div>
              </div>
              <button type="button" onClick={() => setDocAdvanced(true)} style={{ background: 'none', border: 'none', color: T.blue, fontSize: '11px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, fontFamily: T.font }}>Change</button>
            </div>
          ) : (
            <>
              <FieldSelector value={block.tracking_field} onChange={key => set('tracking_field', key)} placeholder="Confirmation field…" filter="date" />
              <button type="button" onClick={() => { set('tracking_field', 'job_docs_last_edit_time'); setDocAdvanced(false); }} style={{ background: 'none', border: 'none', color: T.blue, fontSize: '11px', fontWeight: '600', cursor: 'pointer', marginTop: '6px', fontFamily: T.font }}>Reset to default</button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// standalone=true → this IS the milestone's logic (Custom type): blocks start at
// Check 1 and at least one is required. Otherwise it's the optional "additional
// checks" that combine with a primary type above.
function ExtraChecks({ milestone, update, errors, standalone = false }) {
  const blocks  = milestone.extra_logics || [];
  const combine = milestone.logic_combine || 'and';
  const base    = standalone ? 1 : 2;  // Check number of the first block

  const addBlock    = () => update('extra_logics', [...blocks, { type: 'status', operator: 'equals' }]);
  const setBlock    = (i, b) => update('extra_logics', blocks.map((x, j) => (j === i ? b : x)));
  const removeBlock = (i) => update('extra_logics', blocks.filter((_, j) => j !== i));

  return (
    <div style={standalone ? { marginBottom: '20px' } : { marginTop: '8px', paddingTop: '18px', borderTop: `1px dashed ${T.gray200}` }}>
      <label style={lbl}>
        {standalone ? 'Checks' : 'Additional checks (optional)'} {standalone && <span style={{ color: T.red }}>*</span>}
      </label>
      <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '10px' }}>
        {standalone
          ? 'Build this milestone from one or more checks. Add as many as you need.'
          : 'Combine more checks into this one milestone — e.g. cargo pickup date updated AND pickup status is "Completed".'}
      </p>

      {blocks.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: T.gray600 }}>Milestone is met when</span>
          {[{ v: 'and', l: 'ALL checks pass' }, { v: 'or', l: 'ANY check passes' }].map(o => {
            const sel = combine === o.v;
            return (
              <button key={o.v} type="button" onClick={() => update('logic_combine', o.v)}
                style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: sel ? '700' : '500', fontFamily: T.font, background: sel ? T.blue : '#fff', color: sel ? '#fff' : T.gray700, border: `1px solid ${sel ? T.blue : T.gray200}`, cursor: 'pointer' }}>
                {o.l}
              </button>
            );
          })}
        </div>
      )}

      {blocks.map((b, i) => (
        <LogicBlockEditor key={i} block={b} index={i} checkNo={base + i} onChange={nb => setBlock(i, nb)} onRemove={() => removeBlock(i)} />
      ))}

      {standalone && errors && errors.extra_logics && (
        <p style={{ fontSize: '11px', color: T.red, margin: '2px 0 8px' }}>{errors.extra_logics}</p>
      )}

      <button type="button" onClick={addBlock}
        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px dashed ${T.blue}`, background: T.blueBg, color: T.blue, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: T.font }}>
        + Add {standalone ? 'a' : 'another'} check
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Step2_FieldLinking({ milestone, update, errors }) {
  const typeLabels = {
    date:       'Date Check',
    missing:    'Missing Info',
    comparison: 'Field Comparison',
    document:   'Document Check',
    status:     'Status Check',
    custom:     'Custom',
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
      {milestone.milestone_type === 'status'     && <StatusLinking      milestone={milestone} update={update} errors={errors} />}

      {milestone.milestone_type === 'custom' ? (
        <>
          <ExtraChecks milestone={milestone} update={update} errors={errors} standalone />
          <DueDateBasis milestone={milestone} update={update} errors={errors} />
        </>
      ) : (
        milestone.milestone_type && <ExtraChecks milestone={milestone} update={update} errors={errors} />
      )}
    </div>
  );
}