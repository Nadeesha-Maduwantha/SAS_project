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
import ShipmentDetailModal from '@/components/shipments/ShipmentDetailModal'
import { ShipmentCard } from '@/components/shipments/ShipmentCard'
import { ShipmentViewToggle, ShipmentView } from '@/components/shipments/ShipmentViewToggle'
import { exportAllShipmentsPDF } from '@/lib/Utils/exportPDF'
import { Shipment } from '@/types'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  buildModeOptions,
  TRANSPORT_MODE_STYLES,
  buildStageOptions,
  PICKUP_STATUS_STYLES,
  isDelayedShipment,
} from '@/constants/shipment.constants'

// Constants 
//  all constants are in outside the component so they are not
// recreated on every render.

const PAGE_SIZE = 10

const DEFAULT_FILTERS: Record<string, string> = {
  currentStage:  '',
  transportMode: '',
}

// filterGroups is outside component.

// filterGroups moved inside the component (as a useMemo) because the stage
// options are now derived from the loaded shipments — see buildStageOptions.

// Helpers 

function formatPickupDate(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  })
}

//Component

export default function SalesUserShipmentsPage() {
  const router = useRouter()

  // staffCode and name come from useAuth() instead of hardcoded
  // module-level constants (SALES_USER_STAFF_CODE / SALES_USER_NAME).
  // When auth teammate connects real sessions, only useAuth.ts changes —
  // this page stays the same.
  // NOTE: Company has not provided sales user staff codes yet, so
  // getShipmentsBySalesUser() currently returns all shipments from Flask.
  // Once sales user data is available, Flask will filter by staffCode.
  const { email, name } = useAuth()

  const [currentPage, setCurrentPage]    = useState(1)
  const [shipments, setShipments]        = useState<Shipment[]>([])
  const [loading, setLoading]            = useState(true)
  const [error, setError]                = useState<string | null>(null)
  const [searchQuery, setSearchQuery]    = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(DEFAULT_FILTERS)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [view, setView] = useState<ShipmentView>('table')

  // To Fetching shipments, we use useEffect to call getShipmentsBySalesUser with the email from auth.
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await getShipmentsBySalesUser(email)
        setShipments(data)
      } catch (err) {
        // FIXED: error was swallowed — now logged for debugging
        console.error('Failed to load shipments:', err)
        setError('Failed to load shipments. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [email]) // re-fetches if email changes when real auth is connected

  // Stats
  // isDelayedShipment() imported from constants — single source of
  // truth for delay logic.
  // Stage options derived from the loaded data — dropdown always matches
  // what actually exists in the DB. Memoized: rebuilt only when data changes.
  const filterGroups = useMemo(() => [
    { label: 'By Department', key: 'transportMode', options: buildModeOptions(shipments) },
    { label: 'By Stage',      key: 'currentStage',  options: buildStageOptions(shipments) },
  ], [shipments])

  const stats = useMemo(() => ({
    total:     shipments.length,
    active:    shipments.filter((s) =>
      !s.llmIdentifiedType?.toLowerCase().includes('delivered')
    ).length,
    delayed:   shipments.filter(isDelayedShipment).length,
    delivered: shipments.filter((s) =>
      s.llmIdentifiedType?.toLowerCase().includes('delivered')
    ).length,
  }), [shipments])

  //Filtering
  // isDelayedShipment() used instead of duplicating the condition.
  // Search now checks cargowiseId, consigneeName and branch.
  const filteredShipments = useMemo(() => shipments.filter((s) => {
    if (activeFilters.transportMode && s.transportMode !== activeFilters.transportMode) return false

    if (activeFilters.currentStage === 'Delayed') return isDelayedShipment(s)

    if (activeFilters.currentStage === 'Delivered') {
      return s.llmIdentifiedType?.toLowerCase().includes('delivered') ?? false
    }

    if (
      activeFilters.currentStage &&
      s.llmIdentifiedType !== activeFilters.currentStage &&
      s.currentStage !== activeFilters.currentStage
    ) return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        s.cargowiseId.toLowerCase().includes(q) ||
        (s.consigneeName ?? '').toLowerCase().includes(q) ||
        (s.branch ?? '').toLowerCase().includes(q)
      )
    }

    return true
  }), [shipments, activeFilters, searchQuery])

  // Sorting 
  // Sort by nearest pickup date — shipments without a date go to the bottom
  const sortedShipments = useMemo(() => {
    return [...filteredShipments].sort((a, b) => {
      if (!a.llmCargoPickupDate) return 1
      if (!b.llmCargoPickupDate) return -1
      return new Date(a.llmCargoPickupDate).getTime() - new Date(b.llmCargoPickupDate).getTime()
    })
  }, [filteredShipments])

  // PAGE_SIZE constant used instead of magic number 10
  const paginated = sortedShipments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // To show Loading / Error states.
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

  // Shared "Take Action" button — used by both the table row and the card
  // footer. stopPropagation keeps it from also triggering the row/card click
  // (which opens the detail modal).
  function renderAction(shipment: Shipment) {
    if (shipment.llmIdentifiedType?.toLowerCase().includes('delivered')) {
      return <span className="text-xs text-gray-400 font-medium">Archive</span>
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          router.push(`/sales_user/shipments/${shipment.id}/action`)
        }}
        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Take Action
      </button>
    )
  }

  //Render
  return (
    <div className="p-6 max-w-[1400px]">

      {/* Header — title matches the dashboard's admin-header style */}
      <div className="mb-5">
        <h1 className="text-[18px] font-black text-slate-900">Assigned Shipments</h1>
        {/* FIXED: name now comes from useAuth() instead of hardcoded SALES_USER_NAME */}
        <p className="text-sm text-gray-500 mt-0.5">
          Manage and track your client shipments — {name}
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
           
            onClearAll={() => setActiveFilters(DEFAULT_FILTERS)}
          />
          {/* Sort indicator — currently fixed to pickup date nearest */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Pickup Date (Nearest)
          </div>
          <button
            onClick={() => exportAllShipmentsPDF(sortedShipments)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
          <ShipmentViewToggle view={view} onChange={setView} />
        </div>

        {view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold [&>th]:font-semibold text-gray-500 uppercase tracking-[0.06em]">
                  <th className="text-left px-5 py-3">Shipment ID</th>
                  <th className="text-left px-5 py-3">Client Name</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Transport Mode</th>
                  <th className="text-left px-5 py-3">Pickup Date</th>
                  <th className="text-left px-5 py-3">Pickup Status</th>
                  <th className="text-left px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                      No shipments found
                    </td>
                  </tr>
                ) : paginated.map((shipment) => {
                  const clientInitials = (shipment.consigneeName ?? 'CL')
                    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

                  // transport mode icon background uses TRANSPORT_MODE_STYLES
                  // instead of inline hex ternary
                  const modeStyle = TRANSPORT_MODE_STYLES[shipment.transportMode ?? ''] ?? {
                    bg: 'bg-gray-100', text: 'text-gray-600',
                  }

                  return (
                    <tr
                      key={shipment.id}
                      onClick={() => setSelectedShipment(shipment)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >

                      {/* Shipment ID */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">

                          <div className={`w-8 h-8 rounded-lg ${modeStyle.bg} flex items-center justify-center flex-shrink-0`}>
                            <Truck className={`w-4 h-4 ${modeStyle.text}`} />
                          </div>
                          <div>
                            <p className="text-sm font-mono font-bold text-gray-900">{shipment.cargowiseId}</p>
                            {shipment.branch && (
                              <p className="text-xs text-gray-400 mt-0.5">Branch: {shipment.branch}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-violet-700">
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
                        {shipment.transportMode ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${modeStyle.bg} ${modeStyle.text}`}>
                            {shipment.transportMode}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Pickup Date */}
                      <td className="px-5 py-3.5 text-sm text-gray-700">
                        {formatPickupDate(shipment.llmCargoPickupDate)}
                      </td>

                      {/* Pickup Status */}

                      <td className="px-5 py-3.5">
                        {shipment.pickupDateStatus ? (() => {
                          const pickupStyle = PICKUP_STATUS_STYLES[shipment.pickupDateStatus] ?? {
                            bg: 'bg-gray-50', text: 'text-gray-600',
                          }
                          return (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${pickupStyle.bg} ${pickupStyle.text}`}>
                              {shipment.pickupDateStatus}
                            </span>
                          )
                        })() : <span className="text-xs text-gray-400">—</span>}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5">
                        {renderAction(shipment)}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            {paginated.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-10">No shipments found</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginated.map((shipment) => (
                  <ShipmentCard
                    key={shipment.id}
                    shipment={shipment}
                    onClick={() => setSelectedShipment(shipment)}
                    actionSlot={renderAction(shipment)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/*  PAGE_SIZE constant used instead of magic number 10 */}
        <ShipmentPagination
          currentPage={currentPage}
          totalPages={Math.ceil(sortedShipments.length / PAGE_SIZE)}
          totalResults={sortedShipments.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      <ShipmentDetailModal
        isOpen={!!selectedShipment}
        onClose={() => setSelectedShipment(null)}
        shipment={selectedShipment}
      />
    </div>
  )
}
