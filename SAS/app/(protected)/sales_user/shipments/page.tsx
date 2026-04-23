'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Truck, AlertTriangle, CheckCircle } from 'lucide-react'
import { getShipmentsBySalesUser } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentStatsCard } from '@/components/shipments/ShipmentStatsCard'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { ShipmentFilter } from '@/components/shipments/ShipmentFilter'
import { ShipmentSearch } from '@/components/shipments/ShipmentSearch'
import { exportAllShipmentsPDF } from '@/lib/Utils/exportPDF'
import { Shipment } from '@/types'

// ─── Temporary: replace with session.user.staffCode when auth is ready ───
const SALES_USER_STAFF_CODE = 'DG003'
const SALES_USER_NAME = 'Kasun Fernando'
// ────────────────────────────────────────────────────────────────────────

function formatPickupDate(date: string | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric'
  })
}

export default function SalesUserShipmentsPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    currentStage: '',
    transportMode: '',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await getShipmentsBySalesUser(SALES_USER_STAFF_CODE)
        setShipments(data)
      } catch {
        setError('Failed to load shipments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Stats based on real API data
  const stats = useMemo(() => ({
    total: shipments.length,
    active: shipments.filter((s) =>
      !s.llmIdentifiedType?.toLowerCase().includes('delivered')
    ).length,
    delayed: shipments.filter((s) =>
      s.pickupDateStatus === 'Past' &&
      !s.llmIdentifiedType?.toLowerCase().includes('delivered')
    ).length,
    delivered: shipments.filter((s) =>
      s.llmIdentifiedType?.toLowerCase().includes('delivered')
    ).length,
  }), [shipments])

  // Filter + Search
  const filteredShipments = useMemo(() => shipments.filter((s) => {
    if (activeFilters.transportMode && s.transportMode !== activeFilters.transportMode) return false
    if (activeFilters.currentStage &&
      s.llmIdentifiedType !== activeFilters.currentStage &&
      s.currentStage !== activeFilters.currentStage) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const client = (s.consigneeName ?? '').toLowerCase()
      return (
        s.cargowiseId.toLowerCase().includes(q) ||
        client.includes(q) ||
        (s.branch ?? '').toLowerCase().includes(q)
      )
    }
    return true
  }), [shipments, activeFilters, searchQuery])

  // Sort by pickup date nearest
  const sortedShipments = useMemo(() => {
    return [...filteredShipments].sort((a, b) => {
      if (!a.llmCargoPickupDate) return 1
      if (!b.llmCargoPickupDate) return -1
      return new Date(a.llmCargoPickupDate).getTime() - new Date(b.llmCargoPickupDate).getTime()
    })
  }, [filteredShipments])

  const pageSize = 10
  const paginated = sortedShipments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
      label: 'By Stage',
      key: 'currentStage',
      options: [
        { label: 'Delivered', value: 'Delivered' },
        { label: 'Booking Approval', value: 'Booking Approval' },
        { label: 'Delivery Date', value: 'Delivery Date' },
        { label: 'Delivered to CFS warehouse', value: 'Delivered to CFS warehouse' },
        { label: 'Unknown', value: 'Unknown' },
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
        <h1 className="text-xl font-semibold text-gray-900">Assigned Shipments</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage and track your client shipments — {SALES_USER_NAME}
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
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          <ShipmentSearch
            value={searchQuery}
            onChange={(v) => { setSearchQuery(v); setCurrentPage(1) }}
            placeholder="Search by ID, client or branch..."
          />
          <ShipmentFilter
            groups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={(key, value) =>
              setActiveFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClearAll={() => setActiveFilters({ currentStage: '', transportMode: '' })}
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Pickup Date (Nearest)
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
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Shipment ID</th>
                <th className="text-left px-5 py-3">Client Name</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Transport Mode</th>
                <th className="text-left px-5 py-3">Pickup Date</th>
                <th className="text-left px-5 py-3">Pickup Status</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                    No shipments found
                  </td>
                </tr>
              ) : paginated.map((shipment) => {
                const clientInitials = (shipment.consigneeName ?? 'CL')
                  .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

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
                          {shipment.branch && (
                            <p className="text-xs text-gray-400 mt-0.5">Branch: {shipment.branch}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Client Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: '#ede9fe', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed' }}>
                            {clientInitials}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {shipment.consigneeName ?? '—'}
                          </p>
                          {shipment.gcCode && (
                            <p className="text-xs text-gray-400 mt-0.5">{shipment.gcCode}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
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

                    {/* Pickup Date */}
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      {formatPickupDate(shipment.llmCargoPickupDate)}
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
                      {!shipment.llmIdentifiedType?.toLowerCase().includes('delivered') ? (
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
                        onClick={() => router.push(`/admin/shipments/${shipment.id}?from=/sales_user/shipments`)}
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