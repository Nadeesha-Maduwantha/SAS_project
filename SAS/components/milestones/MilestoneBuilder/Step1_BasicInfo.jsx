'use client';

// =============================================================
//  Step1_BasicInfo.jsx
//  Place at: components/milestones/MilestoneBuilder/Step1_BasicInfo.jsx
//
//  Step 1 of the MilestoneBuilder.
//  User picks: name, milestone type, critical flag, description.
// =============================================================

import { Calendar, AlertTriangle, ArrowRightLeft, FileText } from 'lucide-react';

const MILESTONE_TYPES = [
  {
    value:       'date',
    label:       'Date Check',
    Icon:        Calendar,
    description: 'Alert before, on, or after a date field — e.g. cargo ready date, pickup date.',
  },
  {
    value:       'missing',
    label:       'Missing Info',
    Icon:        AlertTriangle,
    description: 'Alert when a required field is still empty — e.g. consignee contact, email.',
  },
  {
    value:       'comparison',
    label:       'Field Comparison',
    Icon:        ArrowRightLeft,
    description: 'Alert when one field value meets a condition against another field or a fixed value.',
  },
  {
    value:       'document',
    label:       'Document Check',
    Icon:        FileText,
    description: 'Alert when a specific document has not been updated in CargoWise.',
  },
];

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
  redBorder:  '#FECACA',
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

export default function Step1_BasicInfo({ milestone, update, errors }) {
  return (
    <div style={{ fontFamily: T.font }}>

      {/* Section title */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: T.gray900, margin: '0 0 4px' }}>
          Basic Information
        </h3>
        <p style={{ fontSize: '13px', color: T.gray500, margin: 0 }}>
          Give this milestone a name and choose what type of check it performs.
        </p>
      </div>

      {/* Milestone name */}
      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>
          Milestone Name <span style={{ color: T.red }}>*</span>
        </label>
        <input
          value={milestone.name}
          onChange={e => update('name', e.target.value)}
          placeholder='e.g. "Cargo Ready Check" or "Consignee Contact Verification"'
          style={{
            ...inp,
            borderColor: errors.name ? T.red : T.gray200,
            boxShadow:   errors.name ? `0 0 0 3px ${T.redBg}` : 'none',
          }}
          onFocus={e => { e.target.style.borderColor = T.blue; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e  => { e.target.style.borderColor = errors.name ? T.red : T.gray200; e.target.style.boxShadow = 'none'; }}
        />
        {errors.name && (
          <p style={{ fontSize: '11px', color: T.red, marginTop: '4px' }}>{errors.name}</p>
        )}
      </div>

      {/* Milestone type */}
      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>
          Milestone Type <span style={{ color: T.red }}>*</span>
        </label>
        <p style={{ fontSize: '12px', color: T.gray500, marginBottom: '10px' }}>
          Choose what this milestone checks. This determines what fields you configure in the next step.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {MILESTONE_TYPES.map(type => {
            const selected = milestone.milestone_type === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  update('milestone_type', type.value);
                  // Reset field linking when type changes
                  update('primary_field', '');
                  update('expected_date_source', 'self');
                  update('field_a', '');
                  update('operator', '');
                  update('field_b', '');
                  update('document_name', '');
                  update('tracking_field', '');
                }}
                style={{
                  textAlign:     'left',
                  padding:       '14px',
                  borderRadius:  '10px',
                  border:        `2px solid ${selected ? T.blue : T.gray200}`,
                  background:    selected ? T.blueBg : '#fff',
                  cursor:        'pointer',
                  fontFamily:    T.font,
                  transition:    'all 0.15s',
                }}
              >
                <div style={{ marginBottom: '6px', color: selected ? T.blue : T.gray500 }}>
                  <type.Icon size={20} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: selected ? T.blue : T.gray900, marginBottom: '4px' }}>
                  {type.label}
                </div>
                <div style={{ fontSize: '12px', color: T.gray500, lineHeight: '1.5' }}>
                  {type.description}
                </div>
              </button>
            );
          })}
        </div>
        {errors.milestone_type && (
          <p style={{ fontSize: '11px', color: T.red, marginTop: '8px' }}>{errors.milestone_type}</p>
        )}
      </div>

      {/* Critical flag */}
      <div style={{ marginBottom: '20px' }}>
        <label style={lbl}>Priority</label>
        <div
          onClick={() => update('is_critical', !milestone.is_critical)}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '12px',
            padding:       '12px 14px',
            borderRadius:  '8px',
            border:        `1px solid ${milestone.is_critical ? T.redBorder : T.gray200}`,
            background:    milestone.is_critical ? T.redBg : T.gray50,
            cursor:        'pointer',
            transition:    'all 0.15s',
          }}
        >
          {/* Toggle */}
          <div style={{
            width:        '36px',
            height:       '20px',
            borderRadius: '99px',
            background:   milestone.is_critical ? T.red : T.gray200,
            position:     'relative',
            flexShrink:   0,
            transition:   'background 0.2s',
          }}>
            <div style={{
              width:      '14px',
              height:     '14px',
              borderRadius:'50%',
              background: '#fff',
              position:   'absolute',
              top:        '3px',
              left:       milestone.is_critical ? '19px' : '3px',
              transition: 'left 0.2s',
              boxShadow:  '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: milestone.is_critical ? T.red : T.gray700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {milestone.is_critical && <AlertTriangle size={14} strokeWidth={2} />}
              {milestone.is_critical ? 'Critical Milestone' : 'Standard Milestone'}
            </div>
            <div style={{ fontSize: '12px', color: T.gray500, marginTop: '2px' }}>
              Critical milestones appear highlighted in the alert feed and trigger immediate escalation.
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={lbl}>
          Description <span style={{ color: T.gray400, textTransform: 'none', fontWeight: '400' }}>(optional)</span>
        </label>
        <textarea
          value={milestone.description}
          onChange={e => update('description', e.target.value)}
          placeholder='Brief description of what this milestone checks and why it matters…'
          rows={3}
          style={{ ...inp, resize: 'vertical', lineHeight: '1.6', minHeight: '80px' }}
          onFocus={e => { e.target.style.borderColor = T.blue; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e  => { e.target.style.borderColor = T.gray200; e.target.style.boxShadow = 'none'; }}
        />
      </div>

    </div>
  );
}