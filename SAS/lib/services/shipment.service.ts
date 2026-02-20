import { supabase } from '@/lib/supabase'
import { Shipment, ShipmentStatus } from '@/types'

interface ShipmentRow {
  id: string
  cargowise_id: string
  origin_city: string
  origin_country_code: string
  destination_city: string
  destination_country_code: string
  current_stage: string
  carrier: string
  estimated_arrival: string | null
  is_priority: boolean
  delay_reason: string | null
  delay_days: number | null
  delivery_date: string | null
  archived_date: string | null
  transit_days: number | null
  created_by_staff_code: string
  created_by_name: string
  created_by_email: string
  updated_by_staff_code: string
  updated_by_name: string
  updated_by_email: string
  created_at: string
  updated_at: string
  job_number: string | null
  house_bill_number: string | null
  transport_mode: string | null
  branch: string | null
  gb_code: string | null
  gc_code: string | null
  st_description: string | null
  st_note_text: string | null
  cargo_ready_date: string | null
  cargo_received_date: string | null
  cargo_pickup_date: string | null
  pickup_date_status: string | null
  job_last_edit_time: string | null
  llm_identified_type: string | null
  llm_note: string | null
  shipper_name: string | null
  shipper_address: string | null
  shipper_contact: string | null
  shipper_phone: string | null
  consignee_name: string | null
  consignee_address: string | null
  consignee_contact: string | null
  consignee_email: string | null
}

// Maps Supabase row → your Shipment type
function mapRow(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    cargowiseId: row.cargowise_id,
    originCity: row.origin_city,
    originCountryCode: row.origin_country_code,
    destinationCity: row.destination_city,
    destinationCountryCode: row.destination_country_code,
    currentStage: row.current_stage as ShipmentStatus,
    carrier: row.carrier,
    estimatedArrival: row.estimated_arrival ? new Date(row.estimated_arrival) : null,
    isPriority: row.is_priority,
    delayReason: row.delay_reason ?? undefined,
    delayDays: row.delay_days ?? undefined,
    deliveryDate: row.delivery_date ? new Date(row.delivery_date) : undefined,
    archivedDate: row.archived_date ? new Date(row.archived_date) : undefined,
    transitDays: row.transit_days ?? undefined,
    // CargoWise real API fields
    jobNumber: row.job_number ?? undefined,
    houseBillNumber: row.house_bill_number ?? undefined,
    transportMode: row.transport_mode ?? undefined,
    branch: row.branch ?? undefined,
    gbCode: row.gb_code ?? undefined,
    gcCode: row.gc_code ?? undefined,
    stDescription: row.st_description ?? undefined,
    stNoteText: row.st_note_text ?? undefined,
    cargoReadyDate: row.cargo_ready_date ? new Date(row.cargo_ready_date) : undefined,
    cargoReceivedDate: row.cargo_received_date ? new Date(row.cargo_received_date) : undefined,
    cargoPickupDate: row.cargo_pickup_date ? new Date(row.cargo_pickup_date) : undefined,
    pickupDateStatus: row.pickup_date_status ?? undefined,
    jobLastEditTime: row.job_last_edit_time ? new Date(row.job_last_edit_time) : undefined,
    llmIdentifiedType: row.llm_identified_type ?? undefined,
    llmNote: row.llm_note ?? undefined,
    // Shipper & Consignee
    shipperName: row.shipper_name ?? undefined,
    shipperAddress: row.shipper_address ?? undefined,
    shipperContact: row.shipper_contact ?? undefined,
    shipperPhone: row.shipper_phone ?? undefined,
    consigneeName: row.consignee_name ?? undefined,
    consigneeAddress: row.consignee_address ?? undefined,
    consigneeContact: row.consignee_contact ?? undefined,
    consigneeEmail: row.consignee_email ?? undefined,
    // CargoWise user info
    createdBy: {
      staffCode: row.created_by_staff_code,
      name: row.created_by_name,
      email: row.created_by_email,
    },
    lastUpdatedBy: {
      staffCode: row.updated_by_staff_code,
      name: row.updated_by_name,
      email: row.updated_by_email,
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getAllShipments(): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')

  console.log('DATA:', data)
  console.log('ERROR:', error)

  if (error) throw new Error(error.message)
  return data.map(mapRow)
}

export async function getDelayedShipments(): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .not('delay_days', 'is', null)
    .order('delay_days', { ascending: false })

  if (error) throw new Error(error.message)
  return data.map(mapRow)
}

export async function getArchivedShipments(): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('current_stage', 'delivered')
    .not('archived_date', 'is', null)
    .order('archived_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data.map(mapRow)
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return mapRow(data)
}

export async function getShipmentStats() {
  const { data, error } = await supabase
    .from('shipments')
    .select('current_stage, is_priority, delivery_date, archived_date')

  if (error) throw new Error(error.message)

  const today = new Date().toDateString()

  return {
    total: data.length,
    inTransit: data.filter((s) => s.current_stage === 'in_transit').length,
    exceptions: data.filter((s) => s.is_priority).length,
    deliveredToday: data.filter((s) =>
      s.delivery_date &&
      new Date(s.delivery_date).toDateString() === today
    ).length,
  }
}

export async function getDelayedStats() {
  const { data, error } = await supabase
    .from('shipments')
    .select('delay_days, is_priority, current_stage')
    .not('delay_days', 'is', null)

  if (error) throw new Error(error.message)

  const totalDelays = data.reduce((sum, s) => sum + (s.delay_days ?? 0), 0)

  return {
    totalDelayed: data.length,
    highPriority: data.filter((s) => s.is_priority).length,
    avgDelayDays: data.length > 0 ? Math.round(totalDelays / data.length) : 0,
    customsIssues: data.filter((s) => s.current_stage === 'customs_hold').length,
  }
}