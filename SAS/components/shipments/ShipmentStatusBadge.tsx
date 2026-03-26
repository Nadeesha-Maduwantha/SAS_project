'use client'
import { ShipmentStatus } from '@/types'

const statusConfig: Record<ShipmentStatus, { label: string; dot: string; className: string }> = {
  in_transit:          { label: 'In Transit',          dot: 'bg-blue-400',   className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  customs_hold:        { label: 'Customs Hold',        dot: 'bg-red-400',    className: 'bg-red-50 text-red-700 border border-red-200' },
  arrived_at_port:     { label: 'Arrived at Port',     dot: 'bg-purple-400', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  processing:          { label: 'Processing',          dot: 'bg-yellow-400', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  delivered:           { label: 'Delivered',           dot: 'bg-green-400',  className: 'bg-green-50 text-green-700 border border-green-200' },
  port_congestion:     { label: 'Port Congestion',     dot: 'bg-orange-400', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  weather_delay:       { label: 'Weather Delay',       dot: 'bg-sky-400',    className: 'bg-sky-50 text-sky-700 border border-sky-200' },
  equipment_issue:     { label: 'Equipment Issue',     dot: 'bg-amber-400',  className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  documentation_issue: { label: 'Documentation Issue', dot: 'bg-pink-400',   className: 'bg-pink-50 text-pink-700 border border-pink-200' },
  vessel_delay:        { label: 'Vessel Delay',        dot: 'bg-indigo-400', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const c = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}