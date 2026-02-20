'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import { getAllShipments, getShipmentStats } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentStatsCard } from '@/components/shipments/ShipmentStatsCard'
import { ShipmentPagination } from '@/components/shipments/ShipmentPagination'
import { Shipment } from '@/types'

function formatDate(date: Date | null) {
  if (!date) return 'Pending'
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function getAction(s: Shipment): 'take_action' | 'details' | 'archive' {
  if (s.isPriority && s.currentStage !== 'delivered') return 'take_action'
  if (s.currentStage === 'delivered') return 'archive'
  return 'details'
}

export default function AllShipmentsPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [stats, setStats] = useState({ total: 0, inTransit: 0, exceptions: 0, deliveredToday: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [shipmentsData, statsData] = await Promise.all([
          getAllShipments(),
          getShipmentStats(),
        ])
        setShipments(shipmentsData)
        setStats(statsData)
      } catch (err) {
        setError('Failed to load shipments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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
        <ShipmentStatsCard icon={<Package className="w-5 h-5" />} label="Total Shipments" value={stats.total.toLocaleString()} iconBgClass="bg-blue-100 text-blue-600" borderColor="border-l-blue-500" />
        <ShipmentStatsCard icon={<Zap className="w-5 h-5" />} label="In Transit" value={stats.inTransit} iconBgClass="bg-yellow-100 text-yellow-600" borderColor="border-l-yellow-500" />
        <ShipmentStatsCard icon={<AlertTriangle className="w-5 h-5" />} label="Exceptions" value={stats.exceptions} iconBgClass="bg-red-100 text-red-600" borderColor="border-l-red-500" />
        <ShipmentStatsCard icon={<CheckCircle className="w-5 h-5" />} label="Delivered (Today)" value={stats.deliveredToday} iconBgClass="bg-green-100 text-green-600" borderColor="border-l-green-500" />
      </div>

      {/* Table */}
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
                <th className="text-left px-5 py-3">Origin / Destination</th>
                <th className="text-left px-5 py-3">Current Stage</th>
                <th className="text-left px-5 py-3">Carrier</th>
                <th className="text-left px-5 py-3">Est. Arrival</th>
                <th className="text-left px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shipments.map((shipment) => {
                const action = getAction(shipment)
                return (
                  <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {shipment.isPriority && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        <span className="text-sm font-medium text-gray-900">#{shipment.cargowiseId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-gray-900">{shipment.originCity} ({shipment.originCountryCode})</div>
                      <div className="text-xs text-gray-400 mt-0.5">→ {shipment.destinationCity} ({shipment.destinationCountryCode})</div>
                    </td>
                    <td className="px-5 py-3.5"><ShipmentStatusBadge status={shipment.currentStage} /></td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{shipment.carrier}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{formatDate(shipment.estimatedArrival)}</td>
                    <td className="px-5 py-3.5">
                      {action === 'take_action' && (
                        <button className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Take Action</button>
                      )}
                      {action === 'details' && (
                        <button onClick={() => router.push(`/admin/shipments/${shipment.id}`)} className="text-xs font-medium text-blue-600 hover:underline">Details</button>
                      )}
                      {action === 'archive' && (
                        <button className="text-xs font-medium text-gray-500 hover:text-gray-700">Archive</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <ShipmentPagination currentPage={currentPage} totalPages={Math.ceil(shipments.length / 10)} totalResults={shipments.length} pageSize={10} onPageChange={setCurrentPage} />
      </div>
    </div>
  )
}