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
  sales_user_staff_code: string | null
  sales_user_name: string | null
  sales_user_email: string | null
  js_pk: string | null
llm_cargo_pickup_date: string | null
running_date_time: string | null
note_number: number | null
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
    jsPk: row.js_pk ?? undefined,
llmCargoPickupDate: row.llm_cargo_pickup_date ?? undefined,
runningDateTime: row.running_date_time ? new Date(row.running_date_time) : null,
noteNumber: row.note_number ?? null,
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

    salesUserStaffCode: row.sales_user_staff_code ?? undefined,
    salesUserName: row.sales_user_name ?? undefined,
    salesUserEmail: row.sales_user_email ?? undefined,
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
    .eq('pickup_date_status', 'Past')

  if (error) throw new Error(error.message)
  return (data ?? [])
    .map(mapRow)
    .filter((s) =>
      !s.llmIdentifiedType?.toLowerCase().includes('delivered')
    )
}

export async function getArchivedShipments(): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')

  if (error) throw new Error(error.message)
  return (data ?? [])
    .map(mapRow)
    .filter((s) =>
      s.llmIdentifiedType?.toLowerCase().includes('delivered')
    )
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
    .select('*')
    .eq('pickup_date_status', 'Past')

  if (error) throw new Error(error.message)
  const shipments = (data ?? []).map(mapRow)

  const shipments = (data ?? [])
    .map(mapRow)
    .filter((s) =>
      !s.llmIdentifiedType?.toLowerCase().includes('delivered')
    )

  // Calculate average delay days from llm_cargo_pickup_date
const today = new Date()
const delayDaysArray = shipments
  .filter((s) => s.llmCargoPickupDate)
  .map((s) => {
    const pickupDate = new Date(s.llmCargoPickupDate!)
    const diff = Math.floor(
      (today.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diff > 0 ? diff : 0
  })

const avgDelayDays = delayDaysArray.length > 0
  ? Math.round(delayDaysArray.reduce((a, b) => a + b, 0) / delayDaysArray.length)
  : 0

return {
  totalDelayed: shipments.length,
  highPriority: shipments.filter((s) => {
    const note = s.llmNote?.toLowerCase() ?? ''
    return (
      note.includes('urgent') ||
      note.includes('critical') ||
      note.includes('immediate') ||
      note.includes('asap') ||
      note.includes('priority')
    )
  }).length,
  avgDelayDays,
  customsIssues: shipments.filter((s) =>
    s.llmIdentifiedType?.toLowerCase().includes('customs') ||
    s.stNoteText?.toLowerCase().includes('customs')
  ).length,
}
}
export async function getActiveShipmentsByDepartment(department: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('transport_mode', department)

  if (error) throw new Error(error.message)
  return (data ?? [])
    .map(mapRow)
    .filter((s) => !s.llmIdentifiedType?.toLowerCase().includes('delivered'))
}

export async function getArchivedShipmentsByDepartment(department: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('transport_mode', department)

  if (error) throw new Error(error.message)
  return (data ?? [])
    .map(mapRow)
    .filter((s) =>
      s.llmIdentifiedType?.toLowerCase().includes('delivered')
    )
}

export async function getDepartmentStats(department: string) {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('transport_mode', department)

  if (error) throw new Error(error.message)
  const shipments = (data ?? []).map(mapRow)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    onTime: shipments.filter((s) =>
  s.pickupDateStatus === 'Future' &&
  !s.llmIdentifiedType?.toLowerCase().includes('delivered')
).length,
    delayed: shipments.filter((s) =>
      s.pickupDateStatus === 'Past' &&
      !s.llmIdentifiedType?.toLowerCase().includes('delivered')
    ).length,
    atRisk: shipments.filter((s) => {
      const note = s.llmNote?.toLowerCase() ?? ''
      return (
        note.includes('risk') ||
        note.includes('delay') ||
        note.includes('issue') ||
        note.includes('problem') ||
        note.includes('urgent')
      )
    }).length,
    deliveredToday: shipments.filter((s) => {
      if (!s.llmIdentifiedType?.toLowerCase().includes('delivered')) return false
      if (!s.llmCargoPickupDate) return false
      const deliveredDate = new Date(s.llmCargoPickupDate)
      deliveredDate.setHours(0, 0, 0, 0)
      return deliveredDate.getTime() === today.getTime()
    }).length,
  }
}

export async function getShipmentsByOperationUser(
  staffCode: string
): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function getShipmentsBySalesUser(
  staffCode: string
): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')

  if (error) throw new Error(error.message)
  return data.map(mapRow)
}