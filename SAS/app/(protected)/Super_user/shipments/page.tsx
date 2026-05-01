'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertTriangle, Clock, Package } from 'lucide-react'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentStatsCard } from '@/components/shipments/ShipmentStatsCard'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { ShipmentFilter } from '@/components/shipments/ShipmentFilter'
import { exportAllShipmentsPDF } from '@/lib/Utils/exportPDF'
import { Shipment, DepartmentStats } from '@/types'
import { getActiveShipmentsByDepartment, getDepartmentStats } from '@/lib/services/shipment.service'
import { ShipmentSearch } from '@/components/shipments/ShipmentSearch'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  CURRENT_STAGE_OPTIONS,
  PICKUP_STATUS_STYLES,
  isDelayedShipment,
} from '@/constants/shipment.constants'

// ─── Constants ────────────────────────────────────────────────────────────────
// FIXED: all constants moved outside the component so they are not
// recreated on every render.

const PAGE_SIZE = 10

const DEFAULT_FILTERS: Record<string, string> = {
  currentStage: '',
}

// FIXED: department display name now comes from a map instead of an
// inline ternary chain repeated in the JSX.
const DEPARTMENT_LABELS: Record<string, string> = {
  SEA:  'Sea Freight',
  AIR:  'Air Freight',
  ROAD: 'Road Freight',
}

// Super user only filters by stage (department is fixed to their own)
const filterGroups = [
  {
    label: 'By Stage',
    key: 'currentStage',
    // FIXED: reuses CURRENT_STAGE_OPTIONS from constants instead of
    // re-declaring the same strings here.
    // Also fixed: 'Delivered to CFS warehouse' → 'Delivered to CFS'
    // to match the actual llmIdentifiedType value from CargoWise.
    options: CURRENT_STAGE_OPTIONS,
  },
]

const DEFAULT_STATS: DepartmentStats = {
  onTime: 0,
  delayed: 0,
  atRisk: 0,
  deliveredToday: 0,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPickupDate(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuperUserActiveShipmentsPage() {
  const router = useRouter()

  // FIXED: department now comes from useAuth() instead of a hardcoded
  // module-level constant. When auth teammate connects real sessions,
  // only useAuth.ts changes — this page stays the same.
  const { department } = useAuth()

  const [currentPage, setCurrentPage]   = useState(1)
  const [activeTab, setActiveTab]        = useState<'all' | 'expedited' | 'standard'>('all')
  const [shipments, setShipments]        = useState<Shipment[]>([])
  const [stats, setStats]                = useState<DepartmentStats>(DEFAULT_STATS)
  const [loading, setLoading]            = useState(true)
  const [error, setError]                = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(DEFAULT_FILTERS)
  const [searchQuery, setSearchQuery]    = useState('')

  // ─── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [shipmentsData, statsData] = await Promise.all([
          getActiveShipmentsByDepartment(department),
          getDepartmentStats(department),
        ])
        setShipments(shipmentsData)
        setStats(statsData)
      } catch (err) {
        // FIXED: error was swallowed — now logged for debugging
        console.error('Failed to load shipments:', err)
        setError('Failed to load shipments. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [department]) // re-fetches if department changes

  // ─── Filtering ────────────────────────────────────────────────────────────

  // Tab filter — expedited = priority shipments, standard = non-priority
  const tabFiltered = shipments.filter((s) => {
    if (activeTab === 'expedited') return s.isPriority
    if (activeTab === 'standard')  return !s.isPriority
    return true
  })

  // Stage + search filter
  // FIXED: isDelayedShipment() imported from constants — single source of truth
  // for delay logic instead of duplicating the condition inline here.
  const filteredShipments = tabFiltered.filter((s) => {
    if (activeFilters.currentStage === 'Delayed') return isDelayedShipment(s)
    if (
      activeFilters.currentStage &&
      s.llmIdentifiedType !== activeFilters.currentStage &&
      s.currentStage !== activeFilters.currentStage
    ) return false
    if (searchQuery && !s.cargowiseId.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // FIXED: PAGE_SIZE constant used instead of magic number 10
  const paginated = filteredShipments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // ─── Loading / Error ──────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────
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
          {/* FIXED: department label uses DEPARTMENT_LABELS map instead of inline ternary */}
          <p className="text-sm text-gray-500 mt-0.5">
            Department: {DEPARTMENT_LABELS[department] ?? department}
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

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        {/* Tabs + Toolbar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
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

          <div className="flex items-center gap-2 pb-2">
            <ShipmentSearch
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); setCurrentPage(1) }}
            />
            <ShipmentFilter
              groups={filterGroups}
              activeFilters={activeFilters}
              onFilterChange={(key, value) =>
                setActiveFilters((prev) => ({ ...prev, [key]: value }))
              }
              onClearAll={() => setActiveFilters(DEFAULT_FILTERS)}
            />
            <button
              onClick={() => exportAllShipmentsPDF(filteredShipments)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
                <th className="text-left px-5 py-3">Consignee</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Pickup Date</th>
                <th className="text-left px-5 py-3">Pickup Status</th>
                <th className="text-left px-5 py-3">Priority</th>
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
              ) : paginated.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">

                  {/* Shipment ID */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-gray-900">#{shipment.cargowiseId}</p>
                    {shipment.branch && (
                      <p className="text-xs text-gray-400 mt-0.5">Branch: {shipment.branch}</p>
                    )}
                  </td>

                  {/* Consignee */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-900">{shipment.consigneeName ?? '—'}</p>
                    {shipment.gcCode && (
                      <p className="text-xs text-gray-400 mt-0.5">{shipment.gcCode}</p>
                    )}
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

                  {/* Pickup Date */}
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    {formatPickupDate(shipment.llmCargoPickupDate)}
                  </td>

                  {/* Pickup Status */}
                  {/* FIXED: replaced inline hex style objects with Tailwind classes from constants */}
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

                  {/* Action */}
                  {/* FIXED: was checking currentStage !== 'delivered' (lowercase) but real
                      data uses llmIdentifiedType for display stage. Now uses llmIdentifiedType
                      check consistent with the rest of the codebase. Also added onClick. */}
                  <td className="px-5 py-3.5">
                    {!shipment.llmIdentifiedType?.toLowerCase().includes('delivered') && (
                      <button
                        onClick={() => router.push(`/Super_user/shipments/${shipment.id}/action`)}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Take Action
                      </button>
                    )}
                  </td>

                  {/* Detail */}
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

        {/* FIXED: PAGE_SIZE constant used instead of magic number 10 */}
        <ShipmentPagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredShipments.length / PAGE_SIZE)}
          totalResults={filteredShipments.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
