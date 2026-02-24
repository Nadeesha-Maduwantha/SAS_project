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

// ─── Temporary: replace with session.user.department when auth is ready ───
const USER_DEPARTMENT = 'SEA'
// ─────────────────────────────────────────────────────────────────────────

function formatDate(date: Date | null | undefined) {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric'
  })
}

export default function SuperUserArchiveShipmentsPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await getArchivedShipmentsByDepartment(USER_DEPARTMENT)
        setShipments(data)
      } catch {
        setError('Failed to load archived shipments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])
  const [searchQuery, setSearchQuery] = useState('')
  const filteredShipments = shipments.filter((s) => {
  if (searchQuery && !s.cargowiseId.toLowerCase().includes(searchQuery.toLowerCase())) return false
  return true
})

  const pageSize = 10
  const paginated = filteredShipments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-xl font-semibold text-gray-900">Archive Shipments</h1>
    <p className="text-sm text-gray-500 mt-0.5">
      Viewing historical records and completed operations —{' '}
      <span className="font-medium text-gray-700">
        {USER_DEPARTMENT === 'SEA' ? 'Sea Freight' : 'Air Freight'}
      </span>
    </p>
  </div>
  <div className="flex items-center gap-2">
    <ShipmentSearch value={searchQuery} onChange={setSearchQuery} />
    <button
      onClick={() => exportArchivedShipmentsPDF(filteredShipments)}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export PDF
    </button>
  </div>
</div>

      {/* Completed Records Count */}
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
                <th className="text-left px-5 py-3">Origin / Destination</th>
                <th className="text-left px-5 py-3">Completion Date</th>
                <th className="text-left px-5 py-3">Final Status</th>
                <th className="text-left px-5 py-3">Assigned Manager</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
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
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">
                          ARCHIVED
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Origin / Destination */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <span>{shipment.originCountryCode}</span>
                      <span className="text-gray-400">→</span>
                      <span>{shipment.destinationCountryCode}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {shipment.originCity} → {shipment.destinationCity}
                    </p>
                  </td>

                  {/* Completion Date */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-900">{formatDate(shipment.deliveryDate)}</p>
                    {shipment.transitDays && (
                      <p className="text-xs text-gray-400 mt-0.5">{shipment.transitDays} days transit</p>
                    )}
                  </td>

                  {/* Final Status */}
                  <td className="px-5 py-3.5">
                    <ShipmentStatusBadge status={shipment.currentStage} />
                  </td>

                  {/* Assigned Manager */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-600">
                          {shipment.createdBy.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{shipment.createdBy.name}</p>
                    </div>
                  </td>

                  {/* Actions */}
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
totalPages={Math.ceil(filteredShipments.length / pageSize)}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
