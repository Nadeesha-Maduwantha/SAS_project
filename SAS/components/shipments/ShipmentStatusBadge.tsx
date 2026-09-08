'use client'

import { ShipmentStatus } from '@/types'

// ─── Status Config ────────────────────────────────────────────────────────────
// FIXED: keys now match the actual values returned by CargoWise via Flask
// (e.g. 'Booking Approval', 'Delivered to CFS') instead of the old internal
// enum values ('in_transit', 'customs_hold') that never appeared in real data.
const statusConfig: Record<string, { label: string; dot: string; className: string }> = {
  'Booking Approval': {
    label: 'Booking Approval',
    dot: 'bg-yellow-400',
    className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  },
  'Shipment Approval': {
    label: 'Shipment Approval',
    dot: 'bg-orange-400',
    className: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  'Delivery Date': {
    label: 'Delivery Date',
    dot: 'bg-blue-400',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  'Delivered to CFS': {
    label: 'Delivered to CFS',
    dot: 'bg-purple-400',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
  'Import Delivery Instructions': {
    label: 'Import Delivery',
    dot: 'bg-sky-400',
    className: 'bg-sky-50 text-sky-700 border border-sky-200',
  },
  'Delivered': {
    label: 'Delivered',
    dot: 'bg-green-400',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  // lowercase variant from currentStage field — kept as fallback
  'delivered': {
    label: 'Delivered',
    dot: 'bg-green-400',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  'Delayed': {
    label: 'Delayed',
    dot: 'bg-red-400',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ShipmentStatusBadge({ status }: { status: ShipmentStatus | string }) {
  const config = statusConfig[status] ?? {
    label: status ?? 'Unknown',
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
