'use client';

// =============================================================
//  FieldSelector.jsx
//  Place at: components/milestones/MilestoneBuilder/FieldSelector.jsx
//
//  Reusable dropdown for selecting any field from the shipments
//  table. Groups fields into categories for easy navigation.
//  Used in Step 2 (Field Linking) and Step 3 (Alert Rules)
//  of the MilestoneBuilder.
//
//  Props:
//    value       — currently selected field name (DB column name)
//    onChange    — (fieldName, fieldMeta) => void
//    placeholder — string shown when nothing selected
//    filter      — 'all' | 'date' | 'text' | 'number' | 'status'
//                  restricts which categories are shown
//    disabled    — boolean
//    error       — string | null  (shows error border + message)
//    size        — 'sm' | 'md' (default md)
// =============================================================

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Calendar, Tag, Building2, MapPin, Hash, StickyNote, User } from 'lucide-react';

// ── Field definitions ──────────────────────────────────────────────────────────
// Each field has:
//   key      — exact column name in the shipments table
//   label    — human-readable name shown in the UI
//   type     — 'date' | 'text' | 'number' | 'status' | 'boolean'
//   hint     — short description of what the field contains

export const FIELD_CATEGORIES = [
  {
    category: 'Date Fields',
    type:     'date',
    Icon:     Calendar,
    fields: [
      { key: 'cargo_ready_date',          label: 'Cargo Ready Date',          hint: 'Date cargo is ready for collection' },
      { key: 'cargo_received_date',        label: 'Cargo Received Date',        hint: 'Date cargo was received at origin' },
      { key: 'cargo_pickup_date',          label: 'Cargo Pickup Date',          hint: 'Date cargo was picked up' },
      { key: 'estimated_arrival',          label: 'Estimated Arrival',          hint: 'Estimated arrival at destination' },
      { key: 'delivery_date',              label: 'Delivery Date',              hint: 'Actual delivery date' },
      { key: 'llm_cargo_pickup_date',      label: 'AI Pickup Date',             hint: 'Pickup date identified by AI from notes' },
      { key: 'running_date_time',          label: 'Running Date',               hint: 'Current running date from CargoWise' },
      { key: 'job_last_edit_time',         label: 'Job Last Edited',            hint: 'When the job was last modified in CargoWise' },
      { key: 'gen_custom_last_edit_time',  label: 'Customs Last Edited',        hint: 'When customs info was last updated' },
      { key: 'job_docs_last_edit_time',    label: 'Documents Last Edited',      hint: 'When job documents were last updated' },
      { key: 'note_last_edit_time',        label: 'Notes Last Edited',          hint: 'When shipment notes were last updated' },
      { key: 'created_at',                 label: 'Shipment Created At',        hint: 'When the shipment was added to SAS' },
      { key: 'archived_date',              label: 'Archived Date',              hint: 'When the shipment was archived' },
    ],
  },
  {
    category: 'Status Fields',
    type:     'status',
    Icon:     Tag,
    fields: [
      { key: 'pickup_date_status',  label: 'Pickup Status',    hint: 'CargoWise pickup date status e.g. Delayed, Future' },
      { key: 'current_stage',       label: 'Current Stage',    hint: 'Current shipment stage from CargoWise' },
      { key: 'llm_identified_type', label: 'Shipment Type',    hint: 'Shipment type identified by AI' },
      { key: 'st_description',      label: 'Stage Description',hint: 'Full description of current stage' },
      { key: 'transport_mode',      label: 'Transport Mode',   hint: 'AIR, SEA, ROAD etc.' },
      { key: 'branch',              label: 'Branch',           hint: 'Branch handling this shipment' },
      { key: 'carrier',             label: 'Carrier',          hint: 'Carrier / shipping line name' },
    ],
  },
  {
    category: 'Consignee Fields',
    type:     'text',
    Icon:     Building2,
    fields: [
      { key: 'consignee_name',     label: 'Consignee Name',    hint: 'Name of the cargo recipient' },
      { key: 'consignee_email',    label: 'Consignee Email',   hint: 'Email address of the consignee' },
      { key: 'consignee_contact',  label: 'Consignee Contact', hint: 'Phone or contact number of the consignee' },
      { key: 'consignee_address',  label: 'Consignee Address', hint: 'Physical address of the consignee' },
    ],
  },
  {
    category: 'Route Fields',
    type:     'text',
    Icon:     MapPin,
    fields: [
      { key: 'origin_city',        label: 'Origin City',       hint: 'City where the shipment originates' },
      { key: 'destination_city',   label: 'Destination City',  hint: 'City where the shipment is going' },
    ],
  },
  {
    category: 'Numeric Fields',
    type:     'number',
    Icon:     Hash,
    fields: [
      { key: 'delay_days',   label: 'Delay Days',   hint: 'Number of days the shipment is delayed' },
      { key: 'transit_days', label: 'Transit Days', hint: 'Total transit time in days' },
      { key: 'note_number',  label: 'Note Number',  hint: 'Note sequence number in CargoWise' },
    ],
  },
  {
    category: 'Notes & Text',
    type:     'text',
    Icon:     StickyNote,
    fields: [
      { key: 'st_note_text', label: 'Status Note', hint: 'Text note from current stage in CargoWise' },
      { key: 'llm_note',     label: 'AI Note',     hint: 'AI-generated summary note for this shipment' },
      { key: 'delay_reason', label: 'Delay Reason', hint: 'Reason recorded for the delay' },
    ],
  },
  {
    category: 'Staff Fields',
    type:     'text',
    Icon:     User,
    fields: [
      { key: 'sales_user_name',  label: 'Sales Rep Name',  hint: 'Name of the sales user assigned to this shipment' },
      { key: 'sales_user_email', label: 'Sales Rep Email', hint: 'Email of the sales user assigned to this shipment' },
      { key: 'created_by_name',  label: 'Created By',      hint: 'Name of the staff who created this shipment record' },
      { key: 'created_by_email', label: 'Creator Email',   hint: 'Email of the staff who created this shipment record' },
    ],
  },
];

// Flat map for quick lookups: field key → { label, type, hint, category }
export const FIELD_MAP = {};
FIELD_CATEGORIES.forEach(cat => {
  cat.fields.forEach(f => {
    FIELD_MAP[f.key] = { ...f, type: cat.type, category: cat.category };
  });
});

// ── Admin field definitions ───────────────────────────────────────────────────
// Meanings set in System Settings -> Milestone settings -> Field definitions.
// Cached at module level so we fetch once no matter how many selectors mount.
let _defsCache = null;
let _defsPromise = null;
function loadFieldDefinitions() {
  if (_defsCache) return Promise.resolve(_defsCache);
  if (_defsPromise) return _defsPromise;
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  _defsPromise = fetch('http://127.0.0.1:5000/api/field-definitions', {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(r => (r.ok ? r.json() : { data: [] }))
    .then(j => {
      const map = {};
      (j.data || []).forEach(row => { if (row.definition) map[row.api_field] = row.definition; });
      _defsCache = map;
      return map;
    })
    .catch(() => { _defsCache = {}; return _defsCache; });
  return _defsPromise;
}

// ── Helper: get label for a field key ─────────────────────────────────────────
export function getFieldLabel(key) {
  return FIELD_MAP[key]?.label || key;
}

// ── Helper: get type for a field key ──────────────────────────────────────────
export function getFieldType(key) {
  return FIELD_MAP[key]?.type || 'text';
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BASE = {
  fontFamily: "'DM Sans', system-ui, sans-serif",
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FieldSelector({
  value       = '',
  onChange,
  placeholder = 'Select a field…',
  filter      = 'all',
  disabled    = false,
  error       = null,
  size        = 'md',
}) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const [defs,   setDefs]   = useState(_defsCache || {});
  const ref                 = useRef(null);

  // Load admin-defined field meanings once (cached at module level)
  useEffect(() => {
    let alive = true;
    loadFieldDefinitions().then(map => { if (alive) setDefs(map); });
    return () => { alive = false; };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Categories whose type doesn't match the requested filter are shown but
  // greyed out (disabled) rather than hidden — so the user sees every field
  // and understands why some aren't selectable for this milestone type.
  const visibleCategories = FIELD_CATEGORIES
    .map(cat => {
      const disabled = filter !== 'all' && cat.type !== filter;

      // Apply search
      const matched = cat.fields.filter(f =>
        !search ||
        f.label.toLowerCase().includes(search.toLowerCase()) ||
        f.key.toLowerCase().includes(search.toLowerCase()) ||
        f.hint.toLowerCase().includes(search.toLowerCase())
      );
      if (matched.length === 0) return null;
      return { ...cat, fields: matched, disabled };
    })
    .filter(Boolean);

  // Custom / future field: let the user type an API field name that isn't in the
  // known list yet (e.g. first_transit_date). Door 2 registers it on save so the
  // sync starts collecting it once the API returns it.
  const trimmed     = search.trim();
  const exactExists = !!trimmed && Object.keys(FIELD_MAP).some(k => k === trimmed);
  const showCustom  = !!trimmed && !exactExists;
  const customType  = (filter && filter !== 'all') ? filter : 'text';

  // A selected value that isn't in the known map is a custom/future field.
  const selectedMeta = value
    ? (FIELD_MAP[value] || { key: value, label: value, type: customType, custom: true })
    : null;

  const handleSelect = (field, catType) => {
    onChange?.(field.key, { ...field, type: catType });
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('', null);
  };

  const triggerHeight = size === 'sm' ? '32px' : '38px';
  const fontSize      = size === 'sm' ? '12px' : '13px';

  return (
    <div ref={ref} style={{ position: 'relative', ...BASE }}>

      {/* ── Trigger button ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        style={{
          width:          '100%',
          height:         triggerHeight,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 10px',
          background:     disabled ? '#F9FAFB' : '#FFFFFF',
          border:         `1px solid ${error ? '#FCA5A5' : open ? '#3B82F6' : '#E5E7EB'}`,
          borderRadius:   '8px',
          cursor:         disabled ? 'not-allowed' : 'pointer',
          fontSize,
          color:          selectedMeta ? '#111827' : '#9CA3AF',
          boxShadow:      open ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
          transition:     'all 0.15s',
          gap:            '6px',
          outline:        'none',
        }}
      >
        {/* Selected value or placeholder */}
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedMeta ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TypePill type={selectedMeta.type} />
              {selectedMeta.label}
            </span>
          ) : placeholder}
        </span>

        {/* Clear button — shown when value is selected */}
        {value && !disabled && (
          <span
            onClick={handleClear}
            style={{ color: '#9CA3AF', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <X size={12} />
          </span>
        )}

        <ChevronDown
          size={14}
          color="#9CA3AF"
          style={{
            flexShrink:  0,
            transform:   open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition:  'transform 0.2s',
          }}
        />
      </button>

      {/* Error message */}
      {error && (
        <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>{error}</p>
      )}

      {/* ── Dropdown panel ───────────────────────────────────── */}
      {open && (
        <div style={{
          position:    'absolute',
          top:         'calc(100% + 4px)',
          left:        0,
          right:       0,
          zIndex:      999,
          background:  '#FFFFFF',
          border:      '1px solid #E5E7EB',
          borderRadius:'10px',
          boxShadow:   '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
          overflow:    'hidden',
          maxHeight:   '360px',
          display:     'flex',
          flexDirection:'column',
        }}>

          {/* Search bar */}
          <div style={{ padding: '8px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
            <div style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '7px',
              background:   '#F9FAFB',
              border:       '1px solid #E5E7EB',
              borderRadius: '7px',
              padding:      '6px 10px',
            }}>
              <Search size={13} color="#9CA3AF" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search fields…"
                style={{
                  border:     'none',
                  background: 'transparent',
                  outline:    'none',
                  fontSize:   '12px',
                  color:      '#374151',
                  width:      '100%',
                  fontFamily: 'inherit',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={12} color="#9CA3AF" />
                </button>
              )}
            </div>
          </div>

          {/* Field list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visibleCategories.length === 0 && !showCustom ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                No fields match "{search}"
              </div>
            ) : (
              visibleCategories.map(cat => (
                <div key={cat.category}>
                  {/* Category header */}
                  <div style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '6px',
                    padding:      '7px 12px 4px',
                    fontSize:     '10px',
                    fontWeight:   '700',
                    color:        '#9CA3AF',
                    textTransform:'uppercase',
                    letterSpacing:'0.06em',
                    position:     'sticky',
                    top:          0,
                    background:   '#fff',
                    borderBottom: '1px solid #F9FAFB',
                  }}>
                    {cat.Icon && <cat.Icon size={12} />}
                    {cat.category}
                    <TypePill type={cat.type} />
                  </div>

                  {/* Field rows */}
                  {cat.fields.map(field => {
                    const isSelected = field.key === value;
                    const isDisabled = cat.disabled;
                    return (
                      <button
                        key={field.key}
                        type="button"
                        disabled={isDisabled}
                        title={isDisabled ? 'Not compatible with this milestone type' : undefined}
                        onClick={() => { if (!isDisabled) handleSelect(field, cat.type); }}
                        style={{
                          width:       '100%',
                          textAlign:   'left',
                          padding:     '8px 12px',
                          background:  isSelected ? '#EFF6FF' : 'transparent',
                          border:      'none',
                          cursor:      isDisabled ? 'not-allowed' : 'pointer',
                          opacity:     isDisabled ? 0.4 : 1,
                          display:     'flex',
                          flexDirection:'column',
                          gap:         '2px',
                          fontFamily:  'inherit',
                          transition:  'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isDisabled && !isSelected) e.currentTarget.style.background = '#F9FAFB'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          fontSize:   '13px',
                          fontWeight: isSelected ? '600' : '400',
                          color:      isSelected ? '#1D4ED8' : '#374151',
                          display:    'flex',
                          alignItems: 'center',
                          gap:        '6px',
                        }}>
                          {isSelected && <span style={{ fontSize: '10px' }}>✓</span>}
                          {field.label}
                          {/* DB column name in monospace */}
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize:   '10px',
                            color:      isSelected ? '#93C5FD' : '#D1D5DB',
                            fontWeight: '400',
                          }}>
                            {field.key}
                          </span>
                        </span>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          {defs[field.key] || field.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}

            {/* Custom / future field option */}
            {showCustom && (
              <button
                type="button"
                onClick={() => handleSelect({ key: trimmed, label: trimmed }, customType)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  background: '#EFF6FF', border: 'none', borderTop: '1px solid #DBEAFE',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
              >
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Use custom field
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2563EB', background: '#fff', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '1px 6px' }}>
                    {trimmed}
                  </span>
                  <TypePill type={customType} />
                </span>
                <span style={{ fontSize: '11px', color: '#3B82F6' }}>
                  Register this API field so the sync collects it (safe even if it doesn't exist yet).
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ── TypePill — small colored label showing field data type ────────────────────
export function TypePill({ type }) {
  const styles = {
    date:    { bg: '#EFF6FF', text: '#1D4ED8', label: 'DATE'   },
    status:  { bg: '#F0FDF4', text: '#15803D', label: 'STATUS' },
    text:    { bg: '#F9FAFB', text: '#374151', label: 'TEXT'   },
    number:  { bg: '#FFF7ED', text: '#C2410C', label: 'NUM'    },
    boolean: { bg: '#FDF4FF', text: '#7E22CE', label: 'BOOL'   },
  };
  const s = styles[type] || styles.text;
  return (
    <span style={{
      fontSize:     '9px',
      fontWeight:   '700',
      padding:      '1px 5px',
      borderRadius: '4px',
      background:   s.bg,
      color:        s.text,
      letterSpacing:'0.04em',
      flexShrink:   0,
    }}>
      {s.label}
    </span>
  );
}