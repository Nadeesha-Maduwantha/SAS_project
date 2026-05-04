'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { getArchivedShipmentsByDepartment } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { exportArchivedShipmentsPDF } from '@/lib/Utils/exportPDF'
import { Shipment } from '@/types'
import { ShipmentSearch } from '@/components/shipments/ShipmentSearch'
import { useAuth } from '@/lib/hooks/useAuth'
import { PICKUP_STATUS_STYLES } from '@/constants/shipment.constants'

//  Constants 
// PAGE_SIZE moved outside component — was recreated on every render.

const PAGE_SIZE = 10

//  department display label uses a map instead of an inline ternary chain
const DEPARTMENT_LABELS: Record<string, string> = {
  SEA:  'Sea Freight',
  AIR:  'Air Freight',
  ROAD: 'Road Freight',
}

//  Helpers 

function formatPickupDate(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  })
}

//Component 

export default function SuperUserArchiveShipmentsPage() {
  const router = useRouter()

  // department comes from useAuth() instead of a hardcoded
  // module-level constant. When auth teammate connects real sessions,
  // only useAuth.ts changes — this page stays the same.
  const { department } = useAuth()

  const [currentPage, setCurrentPage] = useState(1)
  const [shipments, setShipments]     = useState<Shipment[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // To fetching data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Uses the fixed getArchivedShipmentsByDepartment() which now calls
        // /api/shipments/archived/department/<mode> on Flask instead of
        // fetching all archived shipments and filtering in JavaScript.
        const data = await getArchivedShipmentsByDepartment(department)
        setShipments(data)
      } catch (err) {
        console.error('Failed to load archived shipments:', err)
        setError('Failed to load archived shipments. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [department]) // re-fetches if department changes

  // Filtering(to just search by cargowisse ID) & Pagination 

  const filteredShipments = shipments.filter((s) => {
    if (searchQuery && !s.cargowiseId.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  //  PAGE_SIZE constant used instead of magic number 10
  const paginated = filteredShipments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // To show Loading / Error 
  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-gray-500 text-sm">Loading archived shipments...</p>
    </div>
  )

  if (error) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  )

  //Render 
  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Archive Shipments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Viewing historical records and completed operations —{' '}
            <span className="font-medium text-gray-700">
              {DEPARTMENT_LABELS[department] ?? department}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShipmentSearch
            value={searchQuery}
            onChange={(v) => { setSearchQuery(v); setCurrentPage(1) }}
          />
          <button
            onClick={() => exportArchivedShipmentsPDF(filteredShipments)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Record Count */}
      <div className="flex items-center gap-3 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Completed Records
        </p>
        <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
          {shipments.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Shipment ID</th>
                <th className="text-left px-5 py-3">Consignee</th>
                <th className="text-left px-5 py-3">Final Status</th>
                <th className="text-left px-5 py-3">Pickup Date</th>
                <th className="text-left px-5 py-3">Pickup Status</th>
                <th className="text-left px-5 py-3">AI Note</th>
                <th className="text-left px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                    No archived shipments found
                  </td>
                </tr>
              ) : paginated.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">

                  {/* Shipment ID */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">#{shipment.cargowiseId}</p>
                        {shipment.branch && (
                          <p className="text-xs text-gray-400 mt-0.5">Branch: {shipment.branch}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Consignee */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">
                      {shipment.consigneeName ?? '—'}
                    </p>
                    {shipment.gcCode && (
                      <p className="text-xs text-gray-400 mt-0.5">{shipment.gcCode}</p>
                    )}
                  </td>

                  {/* Final Status */}
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

                  {/* AI Note */}
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-600 max-w-xs truncate">
                      {shipment.llmNote ?? '—'}
                    </p>
                  </td>

                  {/* Details */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => router.push(`/admin/shipments/${shipment.id}?from=/Super_user/shipments/archive`)}
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
          totalPages={Math.ceil(filteredShipments.length / PAGE_SIZE)}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
