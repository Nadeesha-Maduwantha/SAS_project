'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getShipmentById } from '@/lib/services/shipment.service'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { Shipment } from '@/types'
import {
  ArrowLeft, Printer, Truck, Calendar,
  MapPin, Package, User, Mail, Phone, Box
} from 'lucide-react'
import { exportShipmentDetailPDF } from '@/lib/Utils/exportPDF'

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

function getProgressPercent(stage: string): number {
  const map: Record<string, number> = {
    processing: 10,
    in_transit: 50,
    arrived_at_port: 75,
    customs_hold: 60,
    port_congestion: 55,
    weather_delay: 50,
    equipment_issue: 45,
    documentation_issue: 40,
    vessel_delay: 50,
    delivered: 100,
  }
  return map[stage] ?? 30
}

export default function ShipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/admin/shipments'

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading shipment...</p>
    </div>
  )

  if (error || !shipment) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#ef4444', fontSize: '14px' }}>{error}</p>
    </div>
  )

  const progress = getProgressPercent(shipment.currentStage)

  const backLabel =
    from.includes('delayed') ? 'Delayed Shipments' :
    from.includes('archive') ? 'Archived Shipments' :
    'Shipments'

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', fontFamily: 'inherit' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
        <button
          onClick={() => router.push(from)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '13px' }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          {backLabel}
        </button>
        <span>›</span>
        <span style={{ color: '#2563eb', fontWeight: 500 }}>#{shipment.cargowiseId}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Shipment #{shipment.cargowiseId}
            </h1>
            <ShipmentStatusBadge status={shipment.currentStage} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#6b7280', fontSize: '13px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Truck style={{ width: '14px', height: '14px' }} />
              Carrier: {shipment.carrier}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar style={{ width: '14px', height: '14px' }} />
              ETA: {formatDate(shipment.estimatedArrival)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
  <button
    onClick={() => exportShipmentDetailPDF(shipment)}
    style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '8px 16px', fontSize: '13px', fontWeight: 500,
      color: '#374151', background: 'white', border: '1px solid #d1d5db',
      borderRadius: '8px', cursor: 'pointer'
    }}
  >
    <Printer style={{ width: '14px', height: '14px' }} />
    Export PDF
  </button>
</div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Carrier', value: shipment.carrier, icon: <Truck style={{ width: '18px', height: '18px' }} /> },
          { label: 'Transport Mode', value: shipment.transportMode ?? '—', icon: <Package style={{ width: '18px', height: '18px' }} /> },
          { label: 'House Bill Number', value: shipment.houseBillNumber ?? '—', icon: <Box style={{ width: '18px', height: '18px' }} /> },
          { label: 'ETA', value: formatDate(shipment.estimatedArrival), icon: <Calendar style={{ width: '18px', height: '18px' }} /> },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#eff6ff', color: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, margin: '0 0 2px' }}>{stat.label}</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Current Status */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Current Status</h2>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                  Last updated {formatDateTime(shipment.jobLastEditTime)}
                </p>
              </div>
              
            </div>

            {/* Status Box */}
            <div style={{ background: '#f0f7ff', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                </div>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>
                    {shipment.stDescription ?? shipment.currentStage.replace(/_/g, ' ')}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                    {shipment.originCity} ({shipment.originCountryCode}) → {shipment.destinationCity} ({shipment.destinationCountryCode})
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Last Update</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {formatDateTime(shipment.updatedAt)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                <span>{shipment.originCity} ({shipment.originCountryCode})</span>
                <span>{shipment.destinationCity} ({shipment.destinationCountryCode})</span>
              </div>
              <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#2563eb', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {shipment.stNoteText && (
              <p style={{ fontSize: '12px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', padding: '8px 12px', margin: '12px 0 0' }}>
                📝 {shipment.stNoteText}
              </p>
            )}
          </div>

          {/* Route Details */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Route Details</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
              {/* Shipper */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  Shipper (From)
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
                  {shipment.shipperName ?? shipment.originCity}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px', lineHeight: 1.5 }}>
                  {shipment.shipperAddress ?? `${shipment.originCity}, ${shipment.originCountryCode}`}
                </p>
                {shipment.shipperContact && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User style={{ width: '12px', height: '12px' }} /> {shipment.shipperContact}
                  </p>
                )}
                {shipment.shipperPhone && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Phone style={{ width: '12px', height: '12px' }} /> {shipment.shipperPhone}
                  </p>
                )}
              </div>

              {/* Consignee */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  Consignee (To)
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
                  {shipment.consigneeName ?? shipment.destinationCity}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px', lineHeight: 1.5 }}>
                  {shipment.consigneeAddress ?? `${shipment.destinationCity}, ${shipment.destinationCountryCode}`}
                </p>
                {shipment.consigneeContact && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User style={{ width: '12px', height: '12px' }} /> {shipment.consigneeContact}
                  </p>
                )}
                {shipment.consigneeEmail && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail style={{ width: '12px', height: '12px' }} /> {shipment.consigneeEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Map Placeholder */}
            <div style={{
              height: '160px', background: '#f9fafb', borderRadius: '10px',
              border: '1.5px dashed #d1d5db', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              <MapPin style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', margin: 0 }}>Interactive Map</p>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Will show route when milestone data is available</p>
            </div>
          </div>

          {/* Cargo Timeline */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>Cargo Timeline</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: 'Cargo Ready', date: shipment.cargoReadyDate },
                { label: 'Cargo Received', date: shipment.cargoReceivedDate },
                { label: 'Cargo Pickup', date: shipment.cargoPickupDate },
              ].map((item, i) => (
                <div key={i} style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px', fontWeight: 500 }}>{item.label}</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0 }}>{formatDate(item.date)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Previous Milestones */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Previous Milestones</h2>
              <button style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                History Page →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { title: 'Departed Chicago O\'Hare', time: 'Oct 23, 2023 - 08:45 PM', note: 'Flight LH431 en route to Munich for transfer.' },
                { title: 'Picked up from Shipper', time: 'Oct 22, 2023 - 02:30 PM', note: 'Driver: Mike Johnson. Condition: Good.' },
                { title: 'Label Created', time: 'Oct 22, 2023 - 09:15 AM', note: 'Shipping information received.' },
                { title: 'Order Placed', time: 'Oct 21, 2023 - 04:00 PM', note: '' },
              ].map((m, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#bfdbfe', border: '2px solid #93c5fd', marginTop: '2px', flexShrink: 0 }} />
                    {i < arr.length - 1 && <div style={{ width: '1.5px', flex: 1, background: '#e5e7eb', margin: '4px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? '14px' : '0' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{m.title}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px' }}>{m.time}</p>
                    {m.note && <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{m.note}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '14px', padding: '8px 12px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: '#92400e', margin: 0, textAlign: 'center' }}>
                ⏳ Milestone data will connect when module is ready
              </p>
            </div>

            <button style={{
              width: '100%', marginTop: '12px', padding: '8px',
              fontSize: '12px', fontWeight: 500, color: '#374151',
              background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: '8px', cursor: 'pointer'
            }}>
              Download Full Audit Log (CSV)
            </button>
          </div>

          {/* CargoWise Details */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 14px' }}>CargoWise Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Job Number', value: shipment.jobNumber },
                { label: 'House Bill', value: shipment.houseBillNumber },
                { label: 'Branch', value: shipment.branch },
                { label: 'Transport Mode', value: shipment.transportMode },
                { label: 'LLM Type', value: shipment.llmIdentifiedType },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>{item.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{item.value ?? '—'}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px', marginTop: '2px' }}>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px' }}>Created By</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{shipment.createdBy.name}</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{shipment.createdBy.email}</p>
              </div>

              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px' }}>Last Updated By</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{shipment.lastUpdatedBy.name}</p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{shipment.lastUpdatedBy.email}</p>
              </div>
            </div>
          </div>

        

        </div>
      </div>
    </div>
  )
}