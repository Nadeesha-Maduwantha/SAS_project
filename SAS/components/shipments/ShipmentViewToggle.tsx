'use client'

import { List, LayoutGrid } from 'lucide-react'

export type ShipmentView = 'table' | 'cards'

interface Props {
  view: ShipmentView
  onChange: (view: ShipmentView) => void
}

export function ShipmentViewToggle({ view, onChange }: Props) {
  return (
    <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
      <button
        onClick={() => onChange('table')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
          view === 'table' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <List className="w-3.5 h-3.5" />
        Table
      </button>
      <button
        onClick={() => onChange('cards')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors ${
          view === 'cards' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Cards
      </button>
    </div>
  )
}
