'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { getAllShipments } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentStatsCard } from '@/components/shipments/ShipmentStatsCard'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { Shipment } from '@/types'
import { ShipmentFilter } from '@/components/shipments/ShipmentFilter'
import { exportAllShipmentsPDF } from '@/lib/Utils/exportPDF'
import { ShipmentSearch } from '@/components/shipments/ShipmentSearch'

function formatDate(date: Date | null) {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

export default function AllShipmentsPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    transportMode: '',
    currentStage: '',
  })
  const [searchQuery, setSearchQuery] = useState('')

  const filteredShipments = shipments.filter((s) => {
    if (activeFilters.transportMode && s.transportMode !== activeFilters.transportMode) return false
    if (activeFilters.currentStage &&
      s.llmIdentifiedType !== activeFilters.currentStage &&
      s.currentStage !== activeFilters.currentStage) return false
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
      label: 'By Current Stage',
      key: 'currentStage',
      options: [
        { label: 'Delivered', value: 'Delivered' },
        { label: 'Booking Approval', value: 'Booking Approval' },
        { label: 'Delivery Date', value: 'Delivery Date' },
        { label: 'Delivered to CFS warehouse', value: 'Delivered to CFS warehouse' },
        { label: 'Import Delivery Instructions', value: 'Import Delivery Instructions' },
      ],
    },
  ]

  // Stats based on real API data
  const stats = {
    total: shipments.length,
    pending: shipments.filter((s) =>
      s.llmIdentifiedType === 'Booking Approval'
    ).length,
    delivered: shipments.filter((s) =>
      s.llmIdentifiedType?.toLowerCase().includes('delivered')
    ).length,
    delayed: shipments.filter((s) =>
    s.pickupDateStatus === 'Past' &&
    !s.llmIdentifiedType?.toLowerCase().includes('delivered')
  ).length,
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const shipmentsData = await getAllShipments()
        setShipments(shipmentsData)
      } catch {
        setError('Failed to load shipments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const pageSize = 10
  const paginated = filteredShipments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

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
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Shipments Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <ShipmentStatsCard
          icon={<Package className="w-5 h-5" />}
          label="Total Shipments"
          value={stats.total.toLocaleString()}
          iconBgClass="bg-blue-100 text-blue-600"
          borderColor="border-l-blue-500"
        />
        <ShipmentStatsCard
          icon={<Clock className="w-5 h-5" />}
          label="Pending Approval"
          value={stats.pending}
          iconBgClass="bg-yellow-100 text-yellow-600"
          borderColor="border-l-yellow-500"
        />
        <ShipmentStatsCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Delivered"
          value={stats.delivered}
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 px-5 pt-5 pb-4">
          <ShipmentSearch value={searchQuery} onChange={(v) => { setSearchQuery(v); setCurrentPage(1) }} />
          <ShipmentFilter
            groups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={(key, value) =>
              setActiveFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClearAll={() => setActiveFilters({ transportMode: '', currentStage: '' })}
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Shipment ID</th>
                <th className="text-left px-5 py-3">Consignee</th>
                <th className="text-left px-5 py-3">Current Stage</th>
                <th className="text-left px-5 py-3">Transport Mode</th>
                <th className="text-left px-5 py-3">Pickup Status</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">View Details</th>
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
                    <div className="flex items-center gap-2">
                      {shipment.isPriority && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">#{shipment.cargowiseId}</p>
                        {shipment.branch && (
                          <p className="text-xs text-gray-400 mt-0.5">Branch: {shipment.branch}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Consignee */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-900 font-medium">
                      {shipment.consigneeName ?? '—'}
                    </p>
                    {shipment.gcCode && (
                      <p className="text-xs text-gray-400 mt-0.5">{shipment.gcCode}</p>
                    )}
                  </td>

                  {/* Current Stage */}
                  <td className="px-5 py-3.5">
                    <ShipmentStatusBadge status={shipment.llmIdentifiedType ?? shipment.currentStage} />
                    {shipment.stNoteText && (
                      <p className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                        {shipment.stNoteText}
                      </p>
                    )}
                  </td>

                  {/* Transport Mode */}
                  <td className="px-5 py-3.5">
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '3px 10px', borderRadius: '9999px',
                      fontSize: '12px', fontWeight: 600,
                      background: shipment.transportMode === 'AIR' ? '#fef3c7' :
                                  shipment.transportMode === 'ROAD' ? '#f0fdf4' : '#eff6ff',
                      color: shipment.transportMode === 'AIR' ? '#92400e' :
                             shipment.transportMode === 'ROAD' ? '#166534' : '#1e40af',
                    }}>
                      {shipment.transportMode ?? '—'}
                    </span>
                  </td>

                  {/* Pickup Status */}
                  <td className="px-5 py-3.5">
                    {shipment.pickupDateStatus ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '3px 10px', borderRadius: '9999px',
                        fontSize: '12px', fontWeight: 600,
                        background: shipment.pickupDateStatus === 'Future' ? '#eff6ff' :
                                    shipment.pickupDateStatus === 'Past' ? '#fef2f2' : '#f0fdf4',
                        color: shipment.pickupDateStatus === 'Future' ? '#1d4ed8' :
                               shipment.pickupDateStatus === 'Past' ? '#dc2626' : '#16a34a',
                      }}>
                        {shipment.pickupDateStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
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

                  {/* View Details */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => router.push(`/admin/shipments/${shipment.id}`)}
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
          totalResults={filteredShipments.length}
          totalPages={Math.ceil(filteredShipments.length / pageSize)}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}