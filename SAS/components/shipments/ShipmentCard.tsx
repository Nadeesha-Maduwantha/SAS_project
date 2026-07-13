'use client'

import { ChevronRight } from 'lucide-react'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { Shipment } from '@/types'
import { TRANSPORT_MODE_STYLES, PICKUP_STATUS_STYLES } from '@/constants/shipment.constants'

function formatPickupDate(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  })
}

interface ShipmentCardProps {
  shipment: Shipment
  onClick: () => void
  // Slot for a page-specific action button (e.g. "Take Action") — clicks
  // inside this slot are not propagated up to the card's onClick.
  actionSlot?: React.ReactNode
}

export function ShipmentCard({ shipment, onClick, actionSlot }: ShipmentCardProps) {
  const modeStyle = shipment.transportMode
    ? TRANSPORT_MODE_STYLES[shipment.transportMode] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
    : null

  const pickupStyle = shipment.pickupDateStatus
    ? PICKUP_STATUS_STYLES[shipment.pickupDateStatus] ?? { bg: 'bg-gray-50', text: 'text-gray-600' }
    : null

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col"
    >
      {/* Top strip */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {shipment.isPriority && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
            <p className="text-sm font-semibold text-gray-900 truncate">#{shipment.cargowiseId}</p>
          </div>
          {shipment.isPriority !== undefined && (
            <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
              shipment.isPriority ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {shipment.isPriority ? 'HIGH' : 'STANDARD'}
            </span>
          )}
        </div>
        {shipment.branch && (
          <p className="text-xs text-gray-400 mt-1">Branch: {shipment.branch}</p>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Consignee</p>
          <p className="text-sm font-medium text-gray-900">{shipment.consigneeName ?? '—'}</p>
          {shipment.gcCode && <p className="text-xs text-gray-400 mt-0.5">{shipment.gcCode}</p>}
        </div>

        <ShipmentStatusBadge status={shipment.llmIdentifiedType ?? shipment.currentStage} />

        {(modeStyle || pickupStyle) && (
          <div className="flex items-center gap-2 flex-wrap">
            {modeStyle && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${modeStyle.bg} ${modeStyle.text}`}>
                {shipment.transportMode}
              </span>
            )}
            {pickupStyle && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${pickupStyle.bg} ${pickupStyle.text}`}>
                {shipment.pickupDateStatus}
              </span>
            )}
          </div>
        )}

        {shipment.llmCargoPickupDate && (
          <p className="text-xs text-gray-500">
            Pickup: <span className="text-gray-700 font-medium">{formatPickupDate(shipment.llmCargoPickupDate)}</span>
          </p>
        )}

        {shipment.llmNote && (
          <p className="text-xs text-gray-500 line-clamp-2">{shipment.llmNote}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 rounded-b-xl flex items-center justify-between gap-2">
        {actionSlot ? (
          <div onClick={(e) => e.stopPropagation()}>{actionSlot}</div>
        ) : <span />}
        <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
          Details <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  )
}
