'use client';

// =============================================================
//  Step3_AlertRules.jsx
//  Place at: components/milestones/MilestoneBuilder/Step3_AlertRules.jsx
//
//  Step 3 of the MilestoneBuilder.
//  User adds one or more alert rules to the milestone.
//  Each rule has: timing, condition, recurrence, recipient.
// =============================================================

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Check, AlertTriangle } from 'lucide-react';
import FieldSelector, { getFieldLabel } from './FieldSelector';

// ── Default empty rule ────────────────────────────────────────────────────────
function emptyRule() {
  return {
    timing:                'before',
    days_offset:           1,
    fire_time:             '09:00',
    condition:             'always',
    recipient_type:        'operations',
    custom_email:          '',
    recurrence_type:       'once',
    recurrence_interval:   1,
    recurrence_end_type:   'after_n_times',
    recurrence_end_n:      1,
    recurrence_end_date:   '',
    stop_condition_field:  '',
    stop_condition_type:   'is_not_null',
    stop_condition_value:  '',
  };
}

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  redBg:      'var(--red-bg)',
  redBorder:  'var(--red-border)',
  green:      'var(--green)',
  greenBg:    'var(--green-bg)',
};

const inp = {
  padding:      '8px 10px',
  border:       `1px solid ${T.gray200}`,
  borderRadius: '7px',
  fontSize:     '13px',
  color:        T.gray900,
  background:   '#fff',
  outline:      'none',
  fontFamily:   T.font,
  transition:   'border-color 0.15s',
};

const lbl = {
  display:       'block',
  fontSize:      '11px',
  fontWeight:    '600',
  color:         T.gray500,
  marginBottom:  '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

// ── Segment button group ──────────────────────────────────────────────────────
function SegmentGroup({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', borderRadius: '7px', border: `1px solid ${T.gray200}`, overflow: 'hidden', width: 'fit-content' }}>
      {options.map((opt, i) => {
        const sel = value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            title={opt.hint || undefined}
            style={{
              padding:      '7px 14px',
              fontSize:     '12px',
              fontWeight:   sel ? '700' : '500',
              fontFamily:   T.font,
              background:   sel ? T.blue : '#fff',
              color:        sel ? '#fff' : T.gray600,
              border:       'none',
              borderRight:  i < options.length - 1 ? `1px solid ${T.gray200}` : 'none',
              cursor:       'pointer',
              transition:   'all 0.12s',
            }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Single rule card ──────────────────────────────────────────────────────────
function AlertRuleCard({ rule, index, onChange, onDelete, milestoneType }) {
  const [expanded, setExpanded] = useState(true);

  const set = (key, val) => onChange(index, { ...rule, [key]: val });

  // Human-readable summary shown in collapsed state
  const summary = () => {
    const timing  = rule.timing === 'before' ? `${rule.days_offset}d before`
                  : rule.timing === 'after'  ? `${rule.days_offset}d after`
                  : 'on date';
    const recur   = rule.recurrence_type === 'once' ? 'once'
                  : rule.recurrence_type === 'daily' ? 'daily'
                  : rule.recurrence_type === 'weekly' ? 'weekly'
                  : `every ${rule.recurrence_interval}d`;
    const cond    = rule.condition === 'always'             ? 'always'
                  : rule.condition === 'if_not_recorded'    ? 'if field empty'
                  : rule.condition === 'if_comparison_true' ? 'if condition true'
                  : 'if missing';
    return `${timing} at ${rule.fire_time} · ${cond} · ${recur} · to ${rule.recipient_type}`;
  };

  return (
    <div style={{
      border:       `1px solid ${T.gray200}`,
      borderRadius: '10px',
      overflow:     'hidden',
      background:   '#fff',
    }}>

      {/* Card header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '12px 14px',
        background:     T.gray50,
        borderBottom:   expanded ? `1px solid ${T.gray200}` : 'none',
        cursor:         'pointer',
      }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: T.blue, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '700', flexShrink: 0,
          }}>
            {index + 1}
          </span>
          <span style={{ fontSize: '12px', color: T.gray600, fontStyle: 'italic' }}>
            {summary()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" onClick={e => { e.stopPropagation(); onDelete(index); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, display: 'flex', padding: '4px' }}>
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={14} color={T.gray400} /> : <ChevronDown size={14} color={T.gray400} />}
        </div>
      </div>

      {/* Card body */}
      {expanded && (
        <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── TIMING ── */}
          <div>
            <p style={{ ...lbl, marginBottom: '8px' }}>When to fire</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <SegmentGroup
                value={rule.timing}
                onChange={v => set('timing', v)}
                options={[
                  { value: 'before',  label: 'Before',  hint: 'Fire a set number of days before the due date.' },
                  { value: 'on_date', label: 'On date',  hint: 'Fire exactly on the due date.' },
                  { value: 'after',   label: 'After',    hint: 'Fire a set number of days after the due date.' },
                ]}
              />

              {rule.timing !== 'on_date' && (
                <>
                  <input
                    type="number" min="1" max="365"
                    value={rule.days_offset}
                    onChange={e => set('days_offset', parseInt(e.target.value) || 1)}
                    style={{ ...inp, width: '64px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '12px', color: T.gray500 }}>days</span>
                </>
              )}

              <span style={{ fontSize: '12px', color: T.gray500 }}>at</span>
              <input
                type="time"
                value={rule.fire_time}
                onChange={e => set('fire_time', e.target.value)}
                style={{ ...inp, width: '110px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: T.gray400, marginTop: '6px' }}>
              {rule.timing === 'before'  && `Alert fires ${rule.days_offset} day(s) before the milestone due date at ${rule.fire_time}.`}
              {rule.timing === 'on_date' && `Alert fires on the milestone due date at ${rule.fire_time}.`}
              {rule.timing === 'after'   && `Alert fires ${rule.days_offset} day(s) after the milestone due date at ${rule.fire_time}.`}
            </p>
          </div>

          {/* ── CONDITION ── */}
          <div>
            <p style={{ ...lbl, marginBottom: '8px' }}>Fire condition</p>
            <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '8px' }}>
              The alert only sends if this condition is true at fire time.
            </p>
            <SegmentGroup
              value={rule.condition}
              onChange={v => set('condition', v)}
              options={[
                { value: 'always',             label: 'Always',          hint: 'Fires at the scheduled time no matter what — a pure reminder.' },
                { value: 'if_not_recorded',    label: 'If not recorded', hint: 'Fires only if the watched field is still empty (e.g. document not uploaded).' },
                { value: 'if_comparison_true', label: 'If condition',    hint: 'Fires only if the comparison is still true.' },
                { value: 'if_missing',         label: 'If missing',      hint: 'Fires only if the required field is still empty.' },
              ]}
            />
            <p style={{ fontSize: '11px', color: T.gray400, marginTop: '6px' }}>
              {rule.condition === 'always'             && 'Alert fires regardless of field values.'}
              {rule.condition === 'if_not_recorded'    && 'Alert fires only if the primary field still has no value.'}
              {rule.condition === 'if_comparison_true' && 'Alert fires only if the comparison rule is still true.'}
              {rule.condition === 'if_missing'         && 'Alert fires only if the required field is still empty.'}
            </p>
          </div>

          {/* ── RECURRENCE ── */}
          <div>
            <p style={{ ...lbl, marginBottom: '8px' }}>Recurrence</p>
            <SegmentGroup
              value={rule.recurrence_type}
              onChange={v => set('recurrence_type', v)}
              options={[
                { value: 'once',            label: 'Once',   hint: 'Fires a single time, then stops.' },
                { value: 'daily',           label: 'Daily',  hint: 'Repeats every day until the stop condition.' },
                { value: 'weekly',          label: 'Weekly', hint: 'Repeats every week until the stop condition.' },
                { value: 'custom_interval', label: 'Custom', hint: 'Repeats every N days that you set.' },
              ]}
            />

            {/* Custom interval input */}
            {rule.recurrence_type === 'custom_interval' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: T.gray600 }}>Every</span>
                <input
                  type="number" min="1"
                  value={rule.recurrence_interval}
                  onChange={e => set('recurrence_interval', parseInt(e.target.value) || 1)}
                  style={{ ...inp, width: '64px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '12px', color: T.gray600 }}>days</span>
              </div>
            )}

            {/* Stop condition — shown for all except 'once' */}
            {rule.recurrence_type !== 'once' && (
              <div style={{ marginTop: '12px', padding: '12px', background: T.gray50, borderRadius: '8px', border: `1px solid ${T.gray100}` }}>
                <p style={{ ...lbl, marginBottom: '8px' }}>Stop repeating when</p>
                <SegmentGroup
                  value={rule.recurrence_end_type}
                  onChange={v => set('recurrence_end_type', v)}
                  options={[
                    { value: 'after_n_times',        label: 'After N times'    },
                    { value: 'on_date',               label: 'On date'          },
                    { value: 'when_condition_met',    label: 'Condition met'    },
                    { value: 'never',                 label: 'Never (manual)'   },
                  ]}
                />

                {/* After N times */}
                {rule.recurrence_end_type === 'after_n_times' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: T.gray600 }}>Stop after</span>
                    <input
                      type="number" min="1"
                      value={rule.recurrence_end_n}
                      onChange={e => set('recurrence_end_n', parseInt(e.target.value) || 1)}
                      style={{ ...inp, width: '64px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '12px', color: T.gray600 }}>fires</span>
                  </div>
                )}

                {/* On date */}
                {rule.recurrence_end_type === 'on_date' && (
                  <div style={{ marginTop: '10px' }}>
                    <input
                      type="date"
                      value={rule.recurrence_end_date}
                      onChange={e => set('recurrence_end_date', e.target.value)}
                      style={{ ...inp }}
                    />
                  </div>
                )}

                {/* When condition met */}
                {rule.recurrence_end_type === 'when_condition_met' && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <p style={{ ...lbl }}>Watch field</p>
                      <FieldSelector
                        value={rule.stop_condition_field}
                        onChange={key => set('stop_condition_field', key)}
                        placeholder="Select field to check…"
                      />
                    </div>
                    <div>
                      <p style={{ ...lbl }}>Stop when field</p>
                      <SegmentGroup
                        value={rule.stop_condition_type}
                        onChange={v => set('stop_condition_type', v)}
                        options={[
                          { value: 'is_not_null', label: 'Has a value'   },
                          { value: 'is_null',     label: 'Is empty'      },
                          { value: 'equals',      label: 'Equals value'  },
                          { value: 'changed',     label: 'Changes'       },
                        ]}
                      />
                    </div>
                    {rule.stop_condition_type === 'equals' && (
                      <div>
                        <p style={{ ...lbl }}>Value</p>
                        <input
                          value={rule.stop_condition_value}
                          onChange={e => set('stop_condition_value', e.target.value)}
                          placeholder='e.g. "Completed"'
                          style={inp}
                        />
                      </div>
                    )}
                    {rule.stop_condition_field && (
                      <p style={{ fontSize: '11px', color: T.green, marginTop: '2px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <Check size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>Alerts stop automatically when{' '}
                        <strong>{getFieldLabel(rule.stop_condition_field)}</strong>{' '}
                        {rule.stop_condition_type === 'is_not_null' ? 'has a value'
                          : rule.stop_condition_type === 'is_null'  ? 'is empty'
                          : rule.stop_condition_type === 'changed'  ? 'changes'
                          : `equals "${rule.stop_condition_value}"`}.</span>
                      </p>
                    )}

                    {/* Never — manual cancel only */}
                    {rule.recurrence_end_type === 'never' && (
                      <p style={{ fontSize: '11px', color: T.red, marginTop: '8px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>These alerts will only stop when manually cancelled from the milestone detail page.</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RECIPIENT ── */}
          <div>
            <p style={{ ...lbl, marginBottom: '8px' }}>Who receives this alert</p>
            <SegmentGroup
              value={rule.recipient_type}
              onChange={v => set('recipient_type', v)}
              options={[
                { value: 'operations', label: 'Operations', hint: 'The operations user assigned to this shipment.' },
                { value: 'sales',      label: 'Sales',      hint: 'The sales rep assigned to this shipment.' },
                { value: 'consignee',  label: 'Consignee',  hint: 'The consignee email on the shipment record.' },
                { value: 'custom',     label: 'Custom',     hint: 'A specific email address you enter.' },
              ]}
            />
            {rule.recipient_type === 'custom' && (
              <input
                type="email"
                value={rule.custom_email}
                onChange={e => set('custom_email', e.target.value)}
                placeholder="Enter email address…"
                style={{ ...inp, marginTop: '10px', width: '100%', boxSizing: 'border-box' }}
              />
            )}
            <p style={{ fontSize: '11px', color: T.gray400, marginTop: '6px' }}>
              {rule.recipient_type === 'operations' && 'Sent to the operations user assigned to this shipment.'}
              {rule.recipient_type === 'sales'      && 'Sent to the sales rep assigned to this shipment.'}
              {rule.recipient_type === 'consignee'  && 'Sent to the consignee email on the shipment record.'}
              {rule.recipient_type === 'custom'     && 'Sent to the email address entered above.'}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Step3_AlertRules({ milestone, update, errors }) {
  const rules = milestone.alert_rules || [];

  const handleAdd = () => {
    update('alert_rules', [...rules, emptyRule()]);
  };

  const handleChange = (index, updatedRule) => {
    const next = rules.map((r, i) => i === index ? updatedRule : r);
    update('alert_rules', next);
  };

  const handleDelete = (index) => {
    update('alert_rules', rules.filter((_, i) => i !== index));
  };

  return (
    <div style={{ fontFamily: T.font }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: T.gray900, margin: '0 0 4px' }}>
          Alert Rules
        </h3>
        <p style={{ fontSize: '13px', color: T.gray500, margin: 0 }}>
          Define when and how alerts fire for this milestone. Each rule is independent.
        </p>
      </div>

      {/* Error if no rules */}
      {errors.alert_rules && (
        <div style={{ padding: '10px 14px', background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: '8px', fontSize: '13px', color: T.red, marginBottom: '14px' }}>
          {errors.alert_rules}
        </div>
      )}

      {/* Rule cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {rules.map((rule, i) => (
          <AlertRuleCard
            key={i}
            rule={rule}
            index={i}
            onChange={handleChange}
            onDelete={handleDelete}
            milestoneType={milestone.milestone_type}
          />
        ))}
      </div>

      {/* Add rule button */}
      <button
        type="button"
        onClick={handleAdd}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '7px',
          padding:      '9px 16px',
          borderRadius: '8px',
          border:       `1.5px dashed ${T.blueBorder}`,
          background:   T.blueBg,
          color:        T.blue,
          fontSize:     '13px',
          fontWeight:   '600',
          cursor:       'pointer',
          fontFamily:   T.font,
          width:        '100%',
          justifyContent: 'center',
          transition:   'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
        onMouseLeave={e => { e.currentTarget.style.background = T.blueBg; }}
      >
        <Plus size={15} />
        Add Alert Rule
      </button>

      {rules.length > 0 && (
        <p style={{ fontSize: '12px', color: T.gray400, marginTop: '10px', textAlign: 'center' }}>
          {rules.length} rule{rules.length > 1 ? 's' : ''} configured —
          all rules fire independently on their own schedule.
        </p>
      )}
    </div>
  );
}