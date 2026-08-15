'use client';

// =============================================================
//  MilestoneBuilderShell.jsx
//  Place at: components/milestones/MilestoneBuilder/MilestoneBuilderShell.jsx
//
//  4-step wizard shell for creating / editing a library milestone.
//  Steps:
//    1 — Basic Info    (name, type, is_critical, description)
//    2 — Field Linking (which DB field, expected date logic)
//    3 — Alert Rules   (timing, condition, recurrence per rule)
//    4 — Preview       (summary before saving)
//
//  Props:
//    initialData   — existing milestone data for edit mode (null = create)
//    onSave        — (milestonePayload) => Promise<void>
//    onCancel      — () => void
//    saving        — boolean (shows spinner on save button)
// =============================================================

import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import Step1_BasicInfo    from './Step1_BasicInfo';
import Step2_FieldLinking from './Step2_FieldLinking';
import Step3_AlertRules   from './Step3_AlertRules';
import Step4_Preview      from './Step4_Preview';

// ── Default empty state ───────────────────────────────────────────────────────
export function emptyMilestone() {
  return {
    // Step 1
    name:           '',
    description:    '',
    is_critical:    false,
    milestone_type: '',   // 'date' | 'document' | 'comparison' | 'missing'

    // Step 2 — date / missing
    primary_field:        '',
    expected_date_source: '',
    expected_date_field:  '',
    expected_date_offset: 0,

    // Step 2 — document
    document_name:  '',
    tracking_field: '',

    // Step 2 — comparison / status
    field_a:         '',
    operator:        '',
    field_b:         '',
    fixed_value:     '',
    threshold_value: '',

    // Step 2 — additional logic blocks (multi-check milestones)
    extra_logics:  [],       // [{ type, ...checkFields }]
    logic_combine: 'and',    // 'and' | 'or'

    // Step 3
    alert_rules: [],
  };
}

const STEPS = [
  { number: 1, label: 'Basic Info'    },
  { number: 2, label: 'Field Linking' },
  { number: 3, label: 'Alert Rules'   },
  { number: 4, label: 'Preview'       },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const T = {
  font:        "'DM Sans', system-ui, sans-serif",
  blue:        'var(--blue)',
  blueBg:      'var(--blue-bg)',
  blueBorder:  'var(--blue-border)',
  gray900:     'var(--gray-900)',
  gray600:     'var(--gray-600)',
  gray400:     'var(--gray-400)',
  gray200:     'var(--gray-200)',
  gray100:     'var(--gray-100)',
  gray50:      'var(--gray-50)',
  green:       'var(--green)',
  greenBg:     'var(--green-bg)',
  red:         'var(--red)',
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MilestoneBuilderShell({
  initialData = null,
  onSave,
  onCancel,
  saving = false,
}) {
  const [step,      setStep]      = useState(1);
  const [milestone, setMilestone] = useState(
    initialData ? { ...emptyMilestone(), ...initialData } : emptyMilestone()
  );
  const [errors, setErrors] = useState({});

  // Update a top-level field on the milestone
  const update = (key, value) => {
    setMilestone(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  // Update multiple fields at once
  const updateMany = (patch) => {
    setMilestone(prev => ({ ...prev, ...patch }));
  };

  // ── Validation per step ───────────────────────────────────
  const validateStep = (s) => {
    const e = {};

    if (s === 1) {
      if (!milestone.name.trim())     e.name           = 'Milestone name is required';
      if (!milestone.milestone_type)  e.milestone_type = 'Select a milestone type';
    }

    if (s === 2) {
      const type = milestone.milestone_type;

      if (type === 'date') {
        if (!milestone.primary_field) e.primary_field = 'Select the field this milestone watches';
        if (!milestone.expected_date_source) e.expected_date_source = 'Select how the due date is determined';
      }
      if (type === 'missing') {
        if (!milestone.primary_field) e.primary_field = 'Select the field this milestone watches';
      }
      if (type === 'document') {
        if (!milestone.document_name.trim()) e.document_name = 'Enter the document name';
        if (!milestone.tracking_field)       e.tracking_field = 'Select the field that confirms this document';
      }
      if (type === 'comparison') {
        if (!milestone.field_a)   e.field_a   = 'Select the first field';
        if (!milestone.operator)  e.operator  = 'Select a comparison operator';
        if (!milestone.field_b && !milestone.fixed_value)
          e.field_b = 'Select a comparison field or enter a fixed value';
      }
      if (type === 'status') {
        if (!milestone.field_a) e.field_a = 'Select the status field';
        if (!milestone.fixed_value || !milestone.fixed_value.trim())
          e.fixed_value = 'Enter the status value to match';
      }
      if (type === 'custom') {
        if ((milestone.extra_logics || []).length === 0)
          e.extra_logics = 'Add at least one check';
      }

      // Every type needs a due-date basis.
      if (['missing', 'document', 'comparison', 'status', 'custom'].includes(type) &&
          !milestone.expected_date_source) {
        e.expected_date_source = 'Select when this milestone is due';
      }
      if (milestone.expected_date_source === 'another_field' && !milestone.expected_date_field) {
        e.expected_date_field = 'Select the field to base the due date on';
      }

      // Each additional logic block must be complete.
      const badBlock = (milestone.extra_logics || []).some(b => {
        if (b.type === 'date' || b.type === 'missing') return !b.primary_field;
        if (b.type === 'status')     return !b.field_a || !(b.fixed_value || '').trim();
        if (b.type === 'comparison') return !b.field_a || !b.operator || (!b.field_b && !(b.fixed_value || '').trim());
        if (b.type === 'document')   return !b.tracking_field || !(b.document_name || '').trim();
        return true;
      });
      if (badBlock) e.extra_logics = 'Complete or remove the additional checks';
    }

    if (s === 3) {
      if (milestone.alert_rules.length === 0)
        e.alert_rules = 'Add at least one alert rule';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 4));
  };

  const goBack = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSave = () => {
    if (validateStep(3)) onSave?.(milestone);
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: T.font, color: T.gray900 }}>

      {/* Step indicator */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            0,
        marginBottom:   '28px',
        padding:        '16px 20px',
        background:     T.gray50,
        borderRadius:   '12px',
        border:         `1px solid ${T.gray200}`,
      }}>
        {STEPS.map((s, i) => {
          const done    = step > s.number;
          const active  = step === s.number;
          const pending = step < s.number;

          return (
            <div key={s.number} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              {/* Step circle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{
                  width:           '28px',
                  height:          '28px',
                  borderRadius:    '50%',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  fontSize:        '12px',
                  fontWeight:      '700',
                  background:      done    ? T.green   : active ? T.blue   : T.gray200,
                  color:           done || active ? '#fff' : T.gray400,
                  transition:      'all 0.2s',
                  flexShrink:      0,
                }}>
                  {done ? <Check size={14} /> : s.number}
                </div>
                <span style={{
                  fontSize:   '13px',
                  fontWeight: active ? '700' : '500',
                  color:      done    ? T.green  :
                              active  ? T.blue   :
                                        T.gray400,
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  flex:       1,
                  height:     '2px',
                  margin:     '0 10px',
                  background: done ? T.green : T.gray200,
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{
        background:   '#fff',
        border:       `1px solid ${T.gray200}`,
        borderRadius: '12px',
        padding:      '24px',
        minHeight:    '340px',
      }}>
        {step === 1 && (
          <Step1_BasicInfo
            milestone={milestone}
            update={update}
            errors={errors}
          />
        )}
        {step === 2 && (
          <Step2_FieldLinking
            milestone={milestone}
            update={update}
            updateMany={updateMany}
            errors={errors}
          />
        )}
        {step === 3 && (
          <Step3_AlertRules
            milestone={milestone}
            update={update}
            errors={errors}
          />
        )}
        {step === 4 && (
          <Step4_Preview
            milestone={milestone}
          />
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginTop:      '20px',
      }}>
        {/* Left — cancel or back */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {step === 1 ? (
            <button onClick={onCancel} style={btnOutline}>
              Cancel
            </button>
          ) : (
            <button onClick={goBack} style={btnOutline}>
              ← Back
            </button>
          )}
        </div>

        {/* Right — next or save */}
        <div>
          {step < 4 ? (
            <button onClick={goNext} style={btnPrimary}>
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving…' : initialData ? 'Save Changes' : 'Create Milestone'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Button styles ─────────────────────────────────────────────────────────────
const btnBase = {
  display:        'inline-flex',
  alignItems:     'center',
  gap:            '6px',
  padding:        '9px 20px',
  borderRadius:   '9px',
  fontSize:       '13px',
  fontWeight:     '600',
  cursor:         'pointer',
  fontFamily:     "'DM Sans', system-ui, sans-serif",
  transition:     'all 0.15s',
  border:         'none',
};

const btnPrimary = {
  ...btnBase,
  background: '#2563EB',
  color:      '#fff',
};

const btnOutline = {
  ...btnBase,
  background:  '#fff',
  color:       '#374151',
  border:      '1px solid #E5E7EB',
};