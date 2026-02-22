'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import { getShipmentsByOperationUser } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentStatsCard } from '@/components/shipments/ShipmentStatsCard'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { ShipmentFilter } from '@/components/shipments/ShipmentFilter'
import { ShipmentSearch } from '@/components/shipments/ShipmentSearch'
import { exportAllShipmentsPDF } from '@/lib/Utils/exportPDF'
import { Shipment } from '@/types'

// ─── Temporary: replace with session.user.staffCode when auth is ready ───
const OPERATION_USER_STAFF_CODE = 'DG002'
const OPERATION_USER_NAME = 'Amal Perera'
// ────────────────────────────────────────────────────────────────────────



function formatDate(date: Date | null | undefined) {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric'
  })
}

function getScheduleStatus(shipment: Shipment): { label: string; color: string } {
  if (shipment.currentStage === 'delivered') return { label: 'Delivered', color: '#10b981' }
  if (shipment.delayDays && shipment.delayDays > 0) return { label: `Delayed ${shipment.delayDays}d`, color: '#f59e0b' }
  if (shipment.currentStage === 'arrived_at_port') return { label: 'Arriving Soon', color: '#10b981' }
  if (shipment.currentStage === 'processing') return { label: 'Scheduled', color: '#6b7280' }
  return { label: 'On Schedule', color: '#10b981' }
}


export default function OperationUserShipmentsPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    currentStage: '',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await getShipmentsByOperationUser(OPERATION_USER_STAFF_CODE)
        setShipments(data)
      } catch {
        setError('Failed to load shipments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Stats
  const stats = useMemo(() => ({
    total: shipments.length,
    active: shipments.filter((s) => s.currentStage !== 'delivered').length,
    delayed: shipments.filter((s) => s.delayDays && s.delayDays > 0).length,
    delivered: shipments.filter((s) => s.currentStage === 'delivered').length,
  }), [shipments])


  // Dropdown filter
  const dropdownFiltered = useMemo(() => shipments.filter((s) => {
    if (activeFilters.currentStage && s.currentStage !== activeFilters.currentStage) return false
    return true
  }), [shipments, activeFilters])

  // Search filter
  const filteredShipments = useMemo(() => dropdownFiltered.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const route = `${s.originCity} ${s.originCountryCode} ${s.destinationCity} ${s.destinationCountryCode}`.toLowerCase()
    return s.cargowiseId.toLowerCase().includes(q) || route.includes(q)
  }), [dropdownFiltered, searchQuery])

  // Sort by ETA nearest
  const sortedShipments = useMemo(() => {
    return [...filteredShipments].sort((a, b) => {
      if (!a.estimatedArrival) return 1
      if (!b.estimatedArrival) return -1
      return a.estimatedArrival.getTime() - b.estimatedArrival.getTime()
    })
  }, [filteredShipments])

  const pageSize = 10
  const paginated = sortedShipments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const filterGroups = [
    {
      label: 'By Current Stage',
      key: 'currentStage',
      options: [
        { label: 'In Transit', value: 'in_transit' },
        { label: 'Customs Hold', value: 'customs_hold' },
        { label: 'Arrived at Port', value: 'arrived_at_port' },
        { label: 'Processing', value: 'processing' },
        { label: 'Delivered', value: 'delivered' },
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
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">My Assigned Shipments</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage and track your active logistics operations — {OPERATION_USER_NAME}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <ShipmentStatsCard
          icon={<Package className="w-5 h-5" />}
          label="Total Shipments"
          value={stats.total}
          iconBgClass="bg-blue-100 text-blue-600"
          borderColor="border-l-blue-500"
        />
        <ShipmentStatsCard
          icon={<Truck className="w-5 h-5" />}
          label="Active Shipments"
          value={stats.active}
          iconBgClass="bg-yellow-100 text-yellow-600"
          borderColor="border-l-yellow-500"
        />
        <ShipmentStatsCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Delayed"
          value={stats.delayed}
          iconBgClass="bg-red-100 text-red-600"
          borderColor="border-l-red-500"
        />
        <ShipmentStatsCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Delivered"
          value={stats.delivered}
          iconBgClass="bg-green-100 text-green-600"
          borderColor="border-l-green-500"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-5 py-3">
          <ShipmentSearch
            value={searchQuery}
            onChange={(v) => { setSearchQuery(v); setCurrentPage(1) }}
            placeholder="Search by shipment ID or route..."
          />
          <ShipmentFilter
            groups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={(key, value) =>
              setActiveFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClearAll={() => setActiveFilters({ currentStage: '' })}
          />
          {/* Sort indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            ETA (Nearest)
          </div>
          <button
            onClick={() => exportAllShipmentsPDF(sortedShipments)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Shipment ID</th>
                <th className="text-left px-5 py-3">Route</th>
                <th className="text-left px-5 py-3">Vessel / Flight</th>
                <th className="text-left px-5 py-3">ETA</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                    No shipments found
                  </td>
                </tr>
              ) : paginated.map((shipment) => {
                const scheduleStatus = getScheduleStatus(shipment)
                return (
                  <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">

                    {/* Shipment ID */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div style={{
                           width: '32px', height: '32px', borderRadius: '8px',
                           background: shipment.transportMode === 'AIR' ? '#fef3c7' :
                                       shipment.transportMode === 'ROAD' ? '#f0fdf4' : '#eff6ff',
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           flexShrink: 0
                         }}> 
                          <Truck style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">#{shipment.cargowiseId}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {shipment.llmIdentifiedType ?? shipment.transportMode ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-900">
                        {shipment.originCity} ({shipment.originCountryCode}) → {shipment.destinationCity} ({shipment.destinationCountryCode})
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                        {shipment.stNoteText ?? '—'}
                      </p>
                    </td>

                   {/* Vessel / Flight */}
                   <td className="px-5 py-3.5">
                   <p className="text-sm text-gray-700">{shipment.carrier}</p>
                   </td>

                    {/* ETA */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(shipment.estimatedArrival)}
                      </p>
                      <p style={{ fontSize: '11px', color: scheduleStatus.color, marginTop: '2px', fontWeight: 500 }}>
                        {scheduleStatus.label}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <ShipmentStatusBadge status={shipment.currentStage} />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5">
                      {shipment.currentStage !== 'delivered' ? (
                        <button className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          Take Action
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Archive</span>
                      )}
                    </td>

                    {/* Detail */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => router.push(`/admin/shipments/${shipment.id}?from=/operation_user/shipments`)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View Details
                      </button>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <ShipmentPagination
          currentPage={currentPage}
          totalPages={Math.ceil(sortedShipments.length / pageSize)}
          totalResults={sortedShipments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}