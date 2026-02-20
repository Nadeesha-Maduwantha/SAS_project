'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getShipmentById } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { Shipment } from '@/types'
import {
  ArrowLeft, Printer, Pencil, Truck, Calendar,
  MapPin, Package, User, Mail, Phone
} from 'lucide-react'

function formatDate(date: Date | null | undefined) {
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric'
  })
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return '—'
  return date.toLocaleString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ─── Modular Stat Card ────────────────────────────────────────
interface StatItem {
  label: string
  value: string
  icon: React.ReactNode
}

function StatCard({ label, value, icon }: StatItem) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ─── Placeholder Milestone ────────────────────────────────────
const placeholderMilestones = [
  { title: 'Cargo Pickup', date: 'Waiting for milestone data', note: 'Will be connected to milestone module', done: false },
  { title: 'Cargo Received', date: 'Waiting for milestone data', note: 'Will be connected to milestone module', done: false },
  { title: 'Cargo Ready', date: 'Waiting for milestone data', note: 'Will be connected to milestone module', done: false },
  { title: 'Shipment Created', date: 'Waiting for milestone data', note: 'Will be connected to milestone module', done: false },
]

// ─── Main Page ────────────────────────────────────────────────
export default function ShipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await getShipmentById(params.id as string)
        if (!data) setError('Shipment not found')
        else setShipment(data)
      } catch {
        setError('Failed to load shipment')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-gray-500 text-sm">Loading shipment...</p>
    </div>
  )

  if (error || !shipment) return (
    <div className="p-6 flex items-center justify-center h-64">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  )

  // ─── Modular stats — swap these when API gives more fields ───
  const stats: StatItem[] = [
    {
      label: 'Carrier',
      value: shipment.carrier,
      icon: <Truck className="w-5 h-5" />,
    },
    {
      label: 'Transport Mode',
      value: shipment.transportMode ?? '—',
      icon: <Package className="w-5 h-5" />,
    },
    {
      label: 'House Bill Number',
      value: shipment.houseBillNumber ?? '—',
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      label: 'ETA',
      value: formatDate(shipment.estimatedArrival),
      icon: <Calendar className="w-5 h-5" />,
    },
  ]

  return (
    <div className="p-6 max-w-7xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button
          onClick={() => router.push('/admin/shipments')}
          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Shipments
        </button>
        <span>›</span>
        <span className="text-blue-600 font-medium">#{shipment.cargowiseId}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Shipment #{shipment.cargowiseId}
            </h1>
            <ShipmentStatusBadge status={shipment.currentStage} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Truck className="w-4 h-4" />
              Carrier: {shipment.carrier}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              ETA: {formatDate(shipment.estimatedArrival)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" />
            Print Label
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Pencil className="w-4 h-4" />
            Edit Shipment
          </button>
        </div>
      </div>

      {/* Modular Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">

        {/* Left Column — 2/3 width */}
        <div className="col-span-2 space-y-6">

          {/* Current Status Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Current Status
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Last updated {formatDateTime(shipment.jobLastEditTime)}
                </p>
              </div>
              <button className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Manage Status
              </button>
            </div>

            {/* Status Box */}
            <div className="bg-blue-50 rounded-lg p-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {shipment.stDescription ?? shipment.currentStage}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {shipment.originCity} ({shipment.originCountryCode}) →{' '}
                    {shipment.destinationCity} ({shipment.destinationCountryCode})
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">LAST UPDATE</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {formatDateTime(shipment.updatedAt)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{shipment.originCity} ({shipment.originCountryCode})</span>
                <span>{shipment.destinationCity} ({shipment.destinationCountryCode})</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full">
                <div
                  className="h-1.5 bg-blue-500 rounded-full transition-all"
                  style={{
                    width: shipment.currentStage === 'delivered' ? '100%' :
                           shipment.currentStage === 'arrived_at_port' ? '80%' :
                           shipment.currentStage === 'in_transit' ? '50%' :
                           shipment.currentStage === 'processing' ? '30%' : '20%'
                  }}
                />
              </div>
            </div>

            {/* Note */}
            {shipment.stNoteText && (
              <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2">
                📝 {shipment.stNoteText}
              </p>
            )}
          </div>

          {/* Route Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Route Details</h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Shipper */}
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                  Shipper (From)
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {shipment.shipperName ?? shipment.originCity}
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {shipment.shipperAddress ?? `${shipment.originCity}, ${shipment.originCountryCode}`}
                </p>
                {shipment.shipperContact && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {shipment.shipperContact}
                  </p>
                )}
                {shipment.shipperPhone && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {shipment.shipperPhone}
                  </p>
                )}
              </div>

              {/* Consignee */}
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                  Consignee (To)
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {shipment.consigneeName ?? shipment.destinationCity}
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {shipment.consigneeAddress ?? `${shipment.destinationCity}, ${shipment.destinationCountryCode}`}
                </p>
                {shipment.consigneeContact && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {shipment.consigneeContact}
                  </p>
                )}
                {shipment.consigneeEmail && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {shipment.consigneeEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="mt-4 h-40 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
              <div className="text-center">
                <MapPin className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400 font-medium">Interactive Map</p>
                <p className="text-xs text-gray-400">
                  Will show route when milestone data is available
                </p>
              </div>
            </div>
          </div>

          {/* Cargo Dates Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Cargo Timeline</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Cargo Ready</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatDate(shipment.cargoReadyDate)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Cargo Received</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatDate(shipment.cargoReceivedDate)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Cargo Pickup</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatDate(shipment.cargoPickupDate)}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column — 1/3 width */}
        <div className="space-y-6">

          {/* Milestone History — Placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Previous Milestones
              </h2>
              <button className="text-xs text-blue-600 hover:underline">
                History Page →
              </button>
            </div>

            <div className="space-y-4">
              {placeholderMilestones.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-gray-200 flex-shrink-0 mt-0.5" />
                    {i < placeholderMilestones.length - 1 && (
                      <div className="w-px h-8 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className="text-xs font-semibold text-gray-700">{m.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.date}</p>
                    <p className="text-xs text-gray-400 italic mt-0.5">{m.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-700 text-center">
                ⏳ Waiting for milestone module integration
              </p>
            </div>
          </div>

          {/* CargoWise Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              CargoWise Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Job Number</span>
                <span className="text-xs font-medium text-gray-900">
                  {shipment.jobNumber ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">House Bill</span>
                <span className="text-xs font-medium text-gray-900">
                  {shipment.houseBillNumber ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Branch</span>
                <span className="text-xs font-medium text-gray-900">
                  {shipment.branch ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Transport Mode</span>
                <span className="text-xs font-medium text-gray-900">
                  {shipment.transportMode ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">LLM Type</span>
                <span className="text-xs font-medium text-gray-900">
                  {shipment.llmIdentifiedType ?? '—'}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-1">Created By</p>
                <p className="text-xs font-medium text-gray-900">
                  {shipment.createdBy.name}
                </p>
                <p className="text-xs text-gray-400">{shipment.createdBy.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Updated By</p>
                <p className="text-xs font-medium text-gray-900">
                  {shipment.lastUpdatedBy.name}
                </p>
                <p className="text-xs text-gray-400">{shipment.lastUpdatedBy.email}</p>
              </div>
            </div>
          </div>

          {/* Documents Placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Attached Documents
            </h2>
            <div className="space-y-2">
              {['Commercial Invoice', 'Bill of Lading', 'Packing List'].map((doc) => (
                <div key={doc} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                      <span className="text-red-600 text-xs font-bold">PDF</span>
                    </div>
                    <span className="text-xs text-gray-700">{doc}.pdf</span>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline">
                    Download
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-700 text-center">
                ⏳ Real documents coming from API
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
