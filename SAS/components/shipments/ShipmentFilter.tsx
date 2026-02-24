'use client'

import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, ChevronRight, Check, X } from 'lucide-react'

interface FilterOption {
  label: string
  value: string
}

interface FilterGroup {
  label: string
  key: string
  options: FilterOption[]
}

interface Props {
  groups: FilterGroup[]
  activeFilters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  onClearAll: () => void
}

export function ShipmentFilter({
  groups,
  activeFilters,
  onFilterChange,
  onClearAll,
}: Props) {
  const [open, setOpen] = useState(false)
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setHoveredGroup(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeCount = Object.values(activeFilters).filter(Boolean).length

  return (
    <div className="flex items-center gap-2">
      <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>

        {/* Filter Button */}
        <button
          onClick={() => { setOpen(!open); setHoveredGroup(null) }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-all duration-150 ${
            activeCount > 0
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filter
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
              {activeCount}
            </span>
          )}
        </button>

        {/* Main Menu */}
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 9999,
              minWidth: '200px',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
              padding: '4px',
              overflow: 'visible',
            }}
          >
            {/* Menu Header */}
            <div style={{
              padding: '6px 12px 8px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              marginBottom: '4px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Filter by
              </p>
            </div>

            {/* Filter Group Rows */}
            {groups.map((group, index) => (
              <div key={group.key}>
                {/* Divider between groups */}
                {index > 0 && (
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 8px' }} />
                )}

                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredGroup(group.key)}
                  onMouseLeave={() => setHoveredGroup(null)}
                >
                  {/* Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      cursor: 'default',
                      background: hoveredGroup === group.key ? 'rgba(59,130,246,0.08)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: hoveredGroup === group.key ? '#2563eb' : '#374151',
                      }}>
                        {group.label}
                      </span>
                      {activeFilters[group.key] && (
                        <span style={{
                          fontSize: '11px',
                          color: '#2563eb',
                          background: 'rgba(37,99,235,0.1)',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          fontWeight: 500,
                          maxWidth: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {group.options.find(o => o.value === activeFilters[group.key])?.label}
                        </span>
                      )}
                    </div>
                    <ChevronRight style={{
                      width: '14px',
                      height: '14px',
                      color: hoveredGroup === group.key ? '#2563eb' : '#9ca3af',
                    }} />
                  </div>

                  {/* Side Submenu */}
                  {hoveredGroup === group.key && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '100%',
                        top: '-4px',
                        marginLeft: '6px',
                        zIndex: 99999,
                        minWidth: '180px',
                        background: 'rgba(255,255,255,0.97)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '10px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                        padding: '4px',
                      }}
                      onMouseEnter={() => setHoveredGroup(group.key)}
                      onMouseLeave={() => setHoveredGroup(null)}
                    >
                      {/* Submenu Header */}
                      <div style={{
                        padding: '5px 10px 7px',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        marginBottom: '4px',
                      }}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {group.label}
                        </p>
                      </div>

                      {/* Default Option */}
                      <button
                        onClick={() => {
                          onFilterChange(group.key, '')
                          setOpen(false)
                          setHoveredGroup(null)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: !activeFilters[group.key] ? 500 : 400,
                          background: !activeFilters[group.key] ? 'rgba(59,130,246,0.08)' : 'transparent',
                          color: !activeFilters[group.key] ? '#2563eb' : '#374151',
                          transition: 'background 0.1s',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => {
                          if (activeFilters[group.key]) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'
                        }}
                        onMouseLeave={e => {
                          if (activeFilters[group.key]) (e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <span>Default (All)</span>
                        {!activeFilters[group.key] && <Check style={{ width: '14px', height: '14px', color: '#2563eb' }} />}
                      </button>

                      {/* Divider */}
                      <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 8px' }} />

                      {/* Options */}
                      {group.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            onFilterChange(group.key, option.value)
                            setOpen(false)
                            setHoveredGroup(null)
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: activeFilters[group.key] === option.value ? 500 : 400,
                            background: activeFilters[group.key] === option.value ? 'rgba(59,130,246,0.08)' : 'transparent',
                            color: activeFilters[group.key] === option.value ? '#2563eb' : '#374151',
                            transition: 'background 0.1s',
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => {
                            if (activeFilters[group.key] !== option.value)
                              (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'
                          }}
                          onMouseLeave={e => {
                            if (activeFilters[group.key] !== option.value)
                              (e.currentTarget as HTMLElement).style.background = 'transparent'
                          }}
                        >
                          <span>{option.label}</span>
                          {activeFilters[group.key] === option.value && (
                            <Check style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {groups.map((group) =>
            activeFilters[group.key] ? (
              <span
                key={group.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px 3px 10px',
                  background: 'rgba(37,99,235,0.08)',
                  border: '1px solid rgba(37,99,235,0.2)',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#2563eb',
                }}
              >
                {group.options.find(o => o.value === activeFilters[group.key])?.label}
                <button
                  onClick={() => onFilterChange(group.key, '')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(37,99,235,0.15)',
                    cursor: 'pointer',
                    color: '#2563eb',
                    padding: 0,
                  }}
                >
                  <X style={{ width: '9px', height: '9px' }} />
                </button>
              </span>
            ) : null
          )}
          {activeCount > 1 && (
            <button
              onClick={onClearAll}
              style={{
                fontSize: '12px',
                color: '#ef4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}