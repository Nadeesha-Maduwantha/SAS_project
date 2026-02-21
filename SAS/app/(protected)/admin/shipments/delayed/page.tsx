'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Flag, Clock, FileText } from 'lucide-react'
import { getDelayedShipments, getDelayedStats } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentStatsCard } from '@/components/shipments/ShipmentStatsCard'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { Shipment } from '@/types'
import { ShipmentFilter } from '@/components/shipments/ShipmentFilter'
import { exportDelayedShipmentsPDF } from '@/lib/Utils/exportPDF'
import { ShipmentSearch } from '@/components/shipments/ShipmentSearch'

function formatDate(date: Date | null) {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

export default function DelayedShipmentsPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [stats, setStats] = useState({ totalDelayed: 0, highPriority: 0, avgDelayDays: 0, customsIssues: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
  transportMode: '',
  delayRange: '',
})
const [searchQuery, setSearchQuery] = useState('')
const filteredShipments = shipments.filter((s) => {
  if (activeFilters.transportMode && s.transportMode !== activeFilters.transportMode) return false
  if (activeFilters.delayRange) {
    const days = s.delayDays ?? 0
    if (activeFilters.delayRange === '1-3' && !(days >= 1 && days <= 3)) return false
    if (activeFilters.delayRange === '4-7' && !(days >= 4 && days <= 7)) return false
    if (activeFilters.delayRange === '7+' && !(days > 7)) return false
  }
  if (searchQuery && !s.cargowiseId.toLowerCase().includes(searchQuery.toLowerCase())) return false
  return true
})
const filterGroups = [
  {
    label: 'By Department',
    key: 'transportMode',
    options: [
      { label: 'Air Freight', value: 'AIR' },
      { label: 'Sea Freight', value: 'SEA' },
      { label: 'Road Freight', value: 'ROAD' },
    ],
  },
  {
    label: 'No of Delayed Days',
    key: 'delayRange',
    options: [
      { label: '1 - 3 Days', value: '1-3' },
      { label: '4 - 7 Days', value: '4-7' },
      { label: '7+ Days', value: '7+' },
    ],
  },
]

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [shipmentsData, statsData] = await Promise.all([
          getDelayedShipments(),
          getDelayedStats(),
        ])
        setShipments(shipmentsData)
        setStats(statsData)
      } catch {
        setError('Failed to load delayed shipments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-gray-500 text-sm">Loading delayed shipments...</p>
    </div>
  )

  if (error) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Delayed Shipments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track and manage shipments experiencing delays</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <ShipmentStatsCard icon={<AlertTriangle className="w-5 h-5" />} label="Total Delayed" value={stats.totalDelayed} iconBgClass="bg-red-100 text-red-600" borderColor="border-l-red-500" />
        <ShipmentStatsCard icon={<Flag className="w-5 h-5" />} label="High Priority" value={stats.highPriority} iconBgClass="bg-orange-100 text-orange-600" borderColor="border-l-orange-500" />
        <ShipmentStatsCard icon={<Clock className="w-5 h-5" />} label="Avg. Delay" value={`${stats.avgDelayDays} days`} iconBgClass="bg-yellow-100 text-yellow-600" borderColor="border-l-yellow-500" />
        <ShipmentStatsCard icon={<FileText className="w-5 h-5" />} label="Customs Issues" value={stats.customsIssues} iconBgClass="bg-blue-100 text-blue-600" borderColor="border-l-blue-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 px-5 pt-5 pb-4">
          <ShipmentSearch value={searchQuery} onChange={setSearchQuery} />
          <ShipmentFilter
  groups={filterGroups}
  activeFilters={activeFilters}
  onFilterChange={(key, value) =>
    setActiveFilters((prev) => ({ ...prev, [key]: value }))
  }
  onClearAll={() =>
    setActiveFilters({ transportMode: '', delayRange: '' })
  }
/>
          <button
  onClick={() => exportDelayedShipmentsPDF(filteredShipments)}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
  Export PDF
</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Shipment ID</th>
                <th className="text-left px-5 py-3">Route</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Carrier</th>
                <th className="text-left px-5 py-3">Est. Arrival</th>
                <th className="text-left px-5 py-3">Delay Reason</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {shipment.isPriority && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="text-sm font-medium text-gray-900">#{shipment.cargowiseId}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-gray-900">{shipment.originCity} ({shipment.originCountryCode})</div>
                    <div className="text-xs text-gray-400 mt-0.5">→ {shipment.destinationCity} ({shipment.destinationCountryCode})</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <ShipmentStatusBadge status={shipment.currentStage} />
                    {shipment.delayDays && <p className="text-xs text-red-500 mt-1">Delayed by {shipment.delayDays} days</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{shipment.carrier}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{formatDate(shipment.estimatedArrival)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{shipment.delayReason ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <button className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Resolve</button>
                  </td>
                  <td className="px-5 py-3.5">
                   <button
                     onClick={() => router.push(`/admin/shipments/${shipment.id}?from=/admin/shipments/delayed`)}
                     className="text-xs font-medium text-blue-600 hover:underline"
                   >
                     View Details
                   </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ShipmentPagination currentPage={currentPage} totalResults={filteredShipments.length} totalPages={Math.ceil(filteredShipments.length / 10)} pageSize={10} onPageChange={setCurrentPage} />
      </div>
    </div>
  )
}