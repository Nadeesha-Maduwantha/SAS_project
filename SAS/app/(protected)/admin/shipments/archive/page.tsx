'use client'

import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getArchivedShipments } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { Shipment } from '@/types'

function formatDate(date: Date | null | undefined) {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

export default function ArchivedShipmentsPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await getArchivedShipments()
        setShipments(data)
      } catch {
        setError('Failed to load archived shipments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Archived Shipments</h1>
        <p className="text-sm text-gray-500 mt-0.5">View completed and cancelled shipment records</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 px-5 pt-5 pb-4">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Filter</button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Export</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Shipment ID</th>
                <th className="text-left px-5 py-3">Route</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Carrier</th>
                <th className="text-left px-5 py-3">Delivery Date</th>
                <th className="text-left px-5 py-3">Archived Date</th>
                <th className="text-left px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">#{shipment.cargowiseId}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-gray-900">{shipment.originCity} ({shipment.originCountryCode})</div>
                    <div className="text-xs text-gray-400 mt-0.5">→ {shipment.destinationCity} ({shipment.destinationCountryCode})</div>
                  </td>
                  <td className="px-5 py-3.5"><ShipmentStatusBadge status={shipment.currentStage} /></td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{shipment.carrier}</td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-gray-900">{formatDate(shipment.deliveryDate)}</div>
                    {shipment.transitDays && <div className="text-xs text-gray-400 mt-0.5">{shipment.transitDays} days transit</div>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{formatDate(shipment.archivedDate)}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => router.push(`/admin/shipments/${shipment.id}`)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ShipmentPagination currentPage={currentPage} totalPages={Math.ceil(shipments.length / 10)} totalResults={shipments.length} pageSize={10} onPageChange={setCurrentPage} />
      </div>
    </div>
  )
}