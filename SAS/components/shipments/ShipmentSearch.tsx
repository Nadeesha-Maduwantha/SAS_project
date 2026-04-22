'use client'

import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ShipmentSearch({ value, onChange, placeholder = 'Search by shipment ID...' }: Props) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Search style={{
        position: 'absolute', left: '10px',
        width: '14px', height: '14px', color: '#9ca3af',
        pointerEvents: 'none'
      }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          paddingLeft: '32px',
          paddingRight: value ? '32px' : '12px',
          paddingTop: '7px',
          paddingBottom: '7px',
          fontSize: '13px',
          color: '#374151',
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          outline: 'none',
          width: '220px',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#2563eb'}
        onBlur={e => e.target.style.borderColor = '#d1d5db'}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: '8px',
            background: 'none', border: 'none',
            cursor: 'pointer', padding: '2px',
            display: 'flex', alignItems: 'center',
            color: '#9ca3af'
          }}
        >
          <X style={{ width: '13px', height: '13px' }} />
        </button>
      )}
    </div>
  )
}