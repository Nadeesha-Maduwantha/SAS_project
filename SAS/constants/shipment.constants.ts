import { TransportMode } from '@/types'
import { FilterGroup } from '@/components/shipments/ShipmentFilter'


export type { FilterGroup }  


//Transport Mode 
// FilterGroup/FilterOption imported from ShipmentFilter — single source of truth for the type.
export const TRANSPORT_MODE_OPTIONS: FilterGroup['options'] = [
  { label: 'Air Freight', value: 'AIR' },
  { label: 'Sea Freight', value: 'SEA' },
  { label: 'Road Freight', value: 'ROAD' },
]

export const TRANSPORT_MODE_STYLES: Record<TransportMode | string, { bg: string; text: string }> = {
  AIR:  { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  SEA:  { bg: 'bg-blue-50',    text: 'text-blue-800'   },
  ROAD: { bg: 'bg-green-50',   text: 'text-green-800'  },
}

// Current Stage Filter Options 
// These match the actual llmIdentifiedType values returned by CargoWise via Flask.
export const CURRENT_STAGE_OPTIONS: FilterGroup['options'] = [
  { label: 'Delivered',                    value: 'Delivered'                    },
  { label: 'Booking Approval',             value: 'Booking Approval'             },
  { label: 'Shipment Approval',            value: 'Shipment Approval'            },
  { label: 'Delivery Date',                value: 'Delivery Date'                },
  { label: 'Delivered to CFS',             value: 'Delivered to CFS'             },
  { label: 'Import Delivery Instructions', value: 'Import Delivery Instructions' },
  { label: 'Delayed Shipments',            value: 'Delayed'                      },
]

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