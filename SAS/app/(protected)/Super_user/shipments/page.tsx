'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertTriangle, Clock, Package } from 'lucide-react'

import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentStatsCard } from '@/components/shipments/ShipmentStatsCard'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { ShipmentFilter } from '@/components/shipments/ShipmentFilter'
import { exportAllShipmentsPDF } from '@/lib/Utils/exportPDF'
import { Shipment } from '@/types'
import {
  getActiveShipmentsByDepartment,
  getDepartmentStats
} from '@/lib/services/shipment.service'
import { ShipmentSearch } from '@/components/shipments/ShipmentSearch'

// ─── Temporary: replace with session.user.department when auth is ready ───
const USER_DEPARTMENT = 'SEA'
// ─────────────────────────────────────────────────────────────────────────

function formatDate(date: Date | null | undefined) {
  if (!date) return 'Pending'
  return date.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric'
  })
}

function getProgressPercent(stage: string): number {
  const map: Record<string, number> = {
    processing: 10,
    in_transit: 50,
    arrived_at_port: 75,
    customs_hold: 60,
    port_congestion: 55,
    weather_delay: 50,
    equipment_issue: 45,
    documentation_issue: 40,
    vessel_delay: 50,
    delivered: 100,
  }
  return map[stage] ?? 30
}

function getProgressColor(stage: string): string {
  if (['customs_hold', 'port_congestion', 'weather_delay', 'equipment_issue', 'documentation_issue', 'vessel_delay'].includes(stage)) return '#ef4444'
  if (stage === 'delivered') return '#10b981'
  return '#2563eb'
}

export default function SuperUserActiveShipmentsPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'all' | 'expedited' | 'standard'>('all')
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [stats, setStats] = useState({ onTime: 0, delayed: 0, atRisk: 0, deliveredToday: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    currentStage: '',
  })
  

  useEffect(() => {
    async function fetchData() {
  try {
    setLoading(true)
    const [shipmentsData, statsData] = await Promise.all([
      getActiveShipmentsByDepartment(USER_DEPARTMENT),
      getDepartmentStats(USER_DEPARTMENT),
    ])
    setShipments(shipmentsData)
    setStats(statsData)
  } catch {
    setError('Failed to load shipments')
  } finally {
    setLoading(false)
  }
}
    fetchData()
  }, [])

  const tabFiltered = shipments.filter((s) => {
    if (activeTab === 'expedited') return s.isPriority
    if (activeTab === 'standard') return !s.isPriority
    return true
  })
  const [searchQuery, setSearchQuery] = useState('')

  const filteredShipments = tabFiltered.filter((s) => {
  if (activeFilters.currentStage && s.currentStage !== activeFilters.currentStage) return false
  if (searchQuery && !s.cargowiseId.toLowerCase().includes(searchQuery.toLowerCase())) return false
  return true
})

  const pageSize = 10
  const paginated = filteredShipments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const filterGroups = [
    {
      label: 'By Current Stage',
      key: 'currentStage',
      options: [
        { label: 'In Transit', value: 'in_transit' },
        { label: 'Customs Hold', value: 'customs_hold' },
        { label: 'Arrived at Port', value: 'arrived_at_port' },
        { label: 'Processing', value: 'processing' },
      ],
    },
  ]

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-gray-500 text-sm">Loading shipments...</p>
    </div>
  )

  if (error) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Active Shipments</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
              {filteredShipments.length} TOTAL
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Department: {USER_DEPARTMENT === 'SEA' ? 'Sea Freight' : 
                         USER_DEPARTMENT === 'AIR' ? 'Air Freight' : 
                         'Road Freight'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <ShipmentStatsCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="On Time"
          value={stats.onTime}
          iconBgClass="bg-green-100 text-green-600"
          borderColor="border-l-green-500"
        />
        <ShipmentStatsCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Delayed"
          value={stats.delayed}
          iconBgClass="bg-red-100 text-red-600"
          borderColor="border-l-red-500"
        />
        <ShipmentStatsCard
          icon={<Clock className="w-5 h-5" />}
          label="At Risk"
          value={stats.atRisk}
          iconBgClass="bg-orange-100 text-orange-600"
          borderColor="border-l-orange-500"
        />
        <ShipmentStatsCard
          icon={<Package className="w-5 h-5" />}
          label="Delivered Today"
          value={stats.deliveredToday}
          iconBgClass="bg-blue-100 text-blue-600"
          borderColor="border-l-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        {/* Tabs + Toolbar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(['all', 'expedited', 'standard'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentPage(1) }}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Filter + Export */}
          <div className="flex items-center gap-2 pb-2">
            <ShipmentSearch value={searchQuery} onChange={setSearchQuery} />
            <ShipmentFilter
              groups={filterGroups}
              activeFilters={activeFilters}
              onFilterChange={(key, value) =>
                setActiveFilters((prev) => ({ ...prev, [key]: value }))
              }
              onClearAll={() => setActiveFilters({ currentStage: '' })}
            />
            <button
              onClick={() => exportAllShipmentsPDF(filteredShipments)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Shipment ID</th>
                <th className="text-left px-5 py-3">Destination</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Current Phase</th>
                <th className="text-left px-5 py-3">ETA</th>
                <th className="text-left px-5 py-3">Priority</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                    No shipments found
                  </td>
                </tr>
              ) : paginated.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                  {/* Shipment ID */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-gray-900">#{shipment.cargowiseId}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{shipment.carrier}</p>
                  </td>

                  {/* Destination */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-900">{shipment.destinationCity}, {shipment.destinationCountryCode}</p>
                    <p className="text-xs text-gray-400 mt-0.5">From {shipment.originCity}</p>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <ShipmentStatusBadge status={shipment.currentStage} />
                  </td>

                  {/* Current Phase Progress */}
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-600 mb-1.5 capitalize">
                      {shipment.currentStage.replace(/_/g, ' ')}
                    </p>
                    <div style={{ width: '120px', height: '4px', background: '#e5e7eb', borderRadius: '9999px' }}>
                      <div style={{
                        height: '100%',
                        width: `${getProgressPercent(shipment.currentStage)}%`,
                        background: getProgressColor(shipment.currentStage),
                        borderRadius: '9999px',
                      }} />
                    </div>
                  </td>

                  {/* ETA */}
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    {formatDate(shipment.estimatedArrival)}
                  </td>

                  {/* Priority */}
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      shipment.isPriority
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {shipment.isPriority ? 'HIGH' : 'STANDARD'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => router.push(`/admin/shipments/${shipment.id}?from=/Super_user/shipments`)}
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

        <ShipmentPagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredShipments.length / pageSize)}
          totalResults={filteredShipments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}