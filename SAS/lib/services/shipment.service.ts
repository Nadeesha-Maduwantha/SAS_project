import { Shipment, ShipmentMilestone, ShipmentStats, DelayedStats, DepartmentStats } from '@/types'
import { supabase } from '@/lib/supabase'


const FLASK_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// Row Type 

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
  sales_user_staff_code: string | null
  sales_user_name: string | null
  sales_user_email: string | null
  js_pk: string | null
  llm_cargo_pickup_date: string | null
  running_date_time: string | null
  note_number: number | null
}

// Mapper 

function mapRow(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    cargowiseId: row.cargowise_id,
    originCity: row.origin_city,
    originCountryCode: row.origin_country_code,
    destinationCity: row.destination_city,
    destinationCountryCode: row.destination_country_code,
    currentStage: row.current_stage,
    carrier: row.carrier,
    estimatedArrival: row.estimated_arrival ? new Date(row.estimated_arrival) : null,
    isPriority: row.is_priority,
    delayReason: row.delay_reason ?? undefined,
    delayDays: row.delay_days ?? undefined,
    deliveryDate: row.delivery_date ? new Date(row.delivery_date) : undefined,
    archivedDate: row.archived_date ? new Date(row.archived_date) : undefined,
    transitDays: row.transit_days ?? undefined,
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
    jsPk: row.js_pk ?? undefined,
    llmCargoPickupDate: row.llm_cargo_pickup_date ?? undefined,
    runningDateTime: row.running_date_time ? new Date(row.running_date_time) : null,
    noteNumber: row.note_number ?? null,
    shipperName: row.shipper_name ?? undefined,
    shipperAddress: row.shipper_address ?? undefined,
    shipperContact: row.shipper_contact ?? undefined,
    shipperPhone: row.shipper_phone ?? undefined,
    consigneeName: row.consignee_name ?? undefined,
    consigneeAddress: row.consignee_address ?? undefined,
    consigneeContact: row.consignee_contact ?? undefined,
    consigneeEmail: row.consignee_email ?? undefined,
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
    salesUserStaffCode: row.sales_user_staff_code ?? undefined,
    salesUserName: row.sales_user_name ?? undefined,
    salesUserEmail: row.sales_user_email ?? undefined,
  }
}

// Shared Fetch Helper
// centralised fetch with response.ok check so all shipment endpoints
// get consistent error handling instead of silently returning bad data.
async function fetchFlask<T>(path: string): Promise<T> {
  const response = await fetch(`${FLASK_API}${path}`)
  if (!response.ok) {
    throw new Error(`Flask API error ${response.status} on ${path}`)
  }
  const result = await response.json()
  if (result.error) throw new Error(result.error)
  return result.data as T
}

// Shipment Functions 

export async function getAllShipments(): Promise<Shipment[]> {
  const data = await fetchFlask<ShipmentRow[]>('/api/shipments')
  return (data ?? []).map(mapRow)
}

export async function getDelayedShipments(): Promise<Shipment[]> {
  const data = await fetchFlask<ShipmentRow[]>('/api/shipments/delayed')
  return (data ?? []).map(mapRow)
}

export async function getArchivedShipments(): Promise<Shipment[]> {
  const data = await fetchFlask<ShipmentRow[]>('/api/shipments/archived')
  return (data ?? []).map(mapRow)
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  try {
    const data = await fetchFlask<{ shipment: ShipmentRow }>(`/api/shipments/${id}`)
    return mapRow(data.shipment)
  } catch {
    return null
  }
}

export async function getShipmentStats(): Promise<ShipmentStats> {
  return fetchFlask<ShipmentStats>('/api/shipments/stats')
}

export async function getDelayedStats(): Promise<DelayedStats> {
  const data = await fetchFlask<{
    total_delayed: number
    high_priority: number
    avg_delay_days: number
    customs_issues: number
  }>('/api/shipments/stats/delayed')
  return {
    totalDelayed: data.total_delayed,
    highPriority: data.high_priority,
    avgDelayDays: data.avg_delay_days,
    customsIssues: data.customs_issues,
  }
}

export async function getActiveShipmentsByDepartment(department: string): Promise<Shipment[]> {
  const data = await fetchFlask<ShipmentRow[]>(`/api/shipments/department/${department}`)
  return (data ?? []).map(mapRow)
}

// archived department filter done server-side via dedicated endpoint
// instead of fetching all archived shipments and filtering in JavaScript
export async function getArchivedShipmentsByDepartment(department: string): Promise<Shipment[]> {
  const data = await fetchFlask<ShipmentRow[]>(`/api/shipments/archived/department/${department}`)
  return (data ?? []).map(mapRow)
}

export async function getDepartmentStats(department: string): Promise<DepartmentStats> {
  const data = await fetchFlask<{
    on_time: number
    delayed: number
    at_risk: number
    delivered_today: number
  }>(`/api/shipments/stats/department/${department}`)
  return {
    onTime: data.on_time,
    delayed: data.delayed,
    atRisk: data.at_risk,
    deliveredToday: data.delivered_today,
  }
}

// NOTE: staffCode filter is intentionally skipped for now because the mock
// auth hook returns a placeholder staffCode ('STAFF001') that doesn't match
// any created_by_staff_code value in the database.
// All shipments are returned so the operation user page is not empty.
// TODO: re-enable the staffCode filter below once real authentication is
// connected and staffCode comes from a real session:
//   fetchFlask(`/api/shipments?created_by_staff_code=${encodeURIComponent(staffCode)}`)
export async function getShipmentsByOperationUser(staffCode: string): Promise<Shipment[]> {
  const data = await fetchFlask<ShipmentRow[]>('/api/shipments')
  return (data ?? []).map(mapRow)
}

// NOTE: staffCode filter is intentionally skipped for now because the company
// has not yet provided sales user staff codes in the CargoWise data.
// All shipments are returned so the sales user page is not empty.
// TODO: re-enable the staffCode filter below once real sales_user_staff_code
// values exist in the database:
//   fetchFlask(`/api/shipments?sales_user_staff_code=${encodeURIComponent(staffCode)}`)
export async function getShipmentsBySalesUser(staffCode: string): Promise<Shipment[]> {
  const data = await fetchFlask<ShipmentRow[]>('/api/shipments')
  return (data ?? []).map(mapRow)
}

// Milestone Functions 
// NOT CHANGED — these belong to the milestone module (teammate's work).
// Left exactly as originally written.

export async function getMilestonesByShipmentId(shipmentId: string): Promise<ShipmentMilestone[]> {
  const { data, error } = await supabase
    .from('shipment_milestones')
    .select('id, shipment_id, name, sequence_order, is_critical, status, assigned_to, due_date, completed_date, notes, location_label, location_lat, location_lng, days_from_booking, created_at')
    .eq('shipment_id', shipmentId)
    .order('sequence_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getAllMilestones(): Promise<ShipmentMilestone[]> {
  const { data, error } = await supabase
    .from('shipment_milestones')
    .select('id, shipment_id, name, sequence_order, is_critical, status, assigned_to, due_date, completed_date, notes, location_label, location_lat, location_lng, days_from_booking, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}