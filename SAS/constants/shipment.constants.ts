import { TransportMode } from '@/types'
import { FilterGroup } from '@/components/shipments/ShipmentFilter'


export type { FilterGroup }  


//Transport Mode 
// FilterGroup/FilterOption imported from ShipmentFilter — single source of truth for the type.
// Display labels for known modes. Kept as a lookup (not a fixed option list)
// so an unknown mode from CargoWise still renders — see buildModeOptions.
export const TRANSPORT_MODE_LABELS: Record<string, string> = {
  AIR:  'Air Freight',
  SEA:  'Sea Freight',
  ROAD: 'Road Freight',
  RAIL: 'Rail Freight',
}

// Department (transport mode) filter options, derived from the loaded
// shipments so the dropdown never offers a mode that returns no rows.
export function buildModeOptions(
  shipments: { transportMode?: string }[]
): FilterGroup['options'] {
  const modes = new Set<string>()
  for (const s of shipments) {
    if (s.transportMode) modes.add(s.transportMode)
  }
  return [...modes].sort().map((v) => ({
    label: TRANSPORT_MODE_LABELS[v] ?? v,
    value: v,
  }))
}

export const TRANSPORT_MODE_STYLES: Record<TransportMode | string, { bg: string; text: string }> = {
  AIR:  { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  SEA:  { bg: 'bg-blue-50',    text: 'text-blue-800'   },
  ROAD: { bg: 'bg-green-50',   text: 'text-green-800'  },
}

// Current Stage Filter Options
// Derived dynamically from the loaded shipments instead of a hardcoded list,
// so the dropdown always matches the llmIdentifiedType values that actually
// exist in the DB — CargoWise/LLM classifications change over time and a
// static list goes stale (options returning empty results, real stages
// missing). 'Delayed Shipments' is a synthetic option handled by the pages
// via isDelayedShipment(), so it is always appended.
export function buildStageOptions(
  shipments: { llmIdentifiedType?: string }[]
): FilterGroup['options'] {
  const stages = new Set<string>()
  for (const s of shipments) {
    const v = s.llmIdentifiedType
    if (v && v !== 'Delayed') stages.add(v)
  }
  return [
    ...[...stages].sort().map((v) => ({ label: v, value: v })),
    { label: 'Delayed Shipments', value: 'Delayed' },
  ]
}

//Pickup Date Status Styles 
export const PICKUP_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Future:  { bg: 'bg-blue-50',  text: 'text-blue-700'  },
  Delayed: { bg: 'bg-red-50',   text: 'text-red-600'   },
  Past:    { bg: 'bg-red-50',   text: 'text-red-600'   },
  Today:   { bg: 'bg-green-50', text: 'text-green-700' },
}

// Delayed Shipment Logic 
// Single source of truth for what constitutes a "delayed" shipment on the frontend.
// The backend applies the same logic in shipments.py via the is_delayed() helper.
export function isDelayedShipment(shipment: {
  pickupDateStatus?: string
  llmIdentifiedType?: string
}): boolean {
  return (
    shipment.pickupDateStatus === 'Delayed' &&
    !(shipment.llmIdentifiedType ?? '').toLowerCase().includes('delivered')
  )
}