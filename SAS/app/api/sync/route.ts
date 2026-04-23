import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase server environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
interface ShipmentRecord {
  job_number?: string
  transport_mode?: string
  consignee?: string
  house_bill_number?: string | null
  cargo_ready_date?: string | null
  cargo_pickup_date?: string | null
  st_description?: string | null
  st_note_text?: string | null
  branch?: string | null
  gc_code?: string | null
  gb_code?: string | null
  js_pk?: string | null
  llm_identified_type?: string | null
  llm_cargo_pickup_date?: string | null
  llm_note?: string | null
  pickup_date_status?: string | null
  running_date_time?: string | null
  oh_full_name?: string | null
  gen_custom_last_edit_time?: string | null
  job_docs_last_edit_time?: string | null
  note_last_edit_time?: string | null
}

interface SyncErrorDetail {
  shipment_id: string
  field: string
  reason: string
  timestamp: string
}

async function getToken(): Promise<string> {
  const response = await fetch(
    `${process.env.CARGOWISE_API_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: process.env.CARGOWISE_API_USERNAME!,
        password: process.env.CARGOWISE_API_PASSWORD!,
      }),
    }
  )
  const data = await response.json()
  return data.access_token
}

async function fetchShipments(token: string): Promise<unknown> {
  const response = await fetch(
    `${process.env.CARGOWISE_API_URL}/cargo-pickup-date`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error ${response.status}: ${text}`)
  }
  return response.json()
}

function validateRecord(record: ShipmentRecord): string[] {
  const errors: string[] = []
  if (!record.job_number) errors.push('job_number is missing')
  if (!record.transport_mode) errors.push('transport_mode is missing')
  if (!record.consignee) errors.push('consignee is missing')
  return errors
}

export async function GET() {
  try {
    // Step 1 - Get token
    const token = await getToken()

    // Step 2 - Fetch shipments
    const shipments = await fetchShipments(token)

    if (!Array.isArray(shipments)) {
  return NextResponse.json({ 
    error: 'Invalid API response', 
    received: JSON.stringify(shipments).slice(0, 200) 
  }, { status: 500 })
}

    let inserted = 0
    let updated = 0
    let errors = 0
    const errorDetails: SyncErrorDetail[] = []
    const mappedRecords: Array<Record<string, unknown>> = []

    // Step 3 - Validate and map each record
    for (const record of shipments as ShipmentRecord[]) {
      const validationErrors = validateRecord(record)

      if (validationErrors.length > 0) {
        errors++
        errorDetails.push({
          shipment_id: record.job_number ?? 'unknown',
          field: validationErrors[0].split(' ')[0],
          reason: validationErrors[0],
          timestamp: new Date().toISOString(),
        })
        continue
      }

      mappedRecords.push({
        cargowise_id: record.job_number,
        consignee_name: record.consignee,
        transport_mode: record.transport_mode,
        house_bill_number: record.house_bill_number,
        cargo_ready_date: record.cargo_ready_date,
        cargo_pickup_date: record.cargo_pickup_date,
        current_stage: record.st_description ?? 'processing',
        st_note_text: record.st_note_text,
        branch: record.branch,
        gc_code: record.gc_code,
        gb_code: record.gb_code,
        js_pk: record.js_pk,
        llm_identified_type: record.llm_identified_type,
        llm_cargo_pickup_date: record.llm_cargo_pickup_date,
        llm_note: record.llm_note,
        pickup_date_status: record.pickup_date_status,
        running_date_time: record.running_date_time,
        created_by_name: record.oh_full_name,
        updated_at: new Date().toISOString(),
        gen_custom_last_edit_time: record.gen_custom_last_edit_time ?? null,
        job_docs_last_edit_time: record.job_docs_last_edit_time ?? null,
        note_last_edit_time: record.note_last_edit_time ?? null,
        is_priority: 
          record.pickup_date_status === 'Past' && (
            record.llm_note?.toLowerCase().includes('urgent') ||
            record.llm_note?.toLowerCase().includes('critical') ||
            record.llm_note?.toLowerCase().includes('immediate') ||
            record.llm_note?.toLowerCase().includes('asap') ||
            record.llm_note?.toLowerCase().includes('priority')
  ) ? true : false,
      })
    }

    // Step 4 - Upsert in bulk
    if (mappedRecords.length > 0) {
      const cargowiseIds = mappedRecords
        .map((record) => record.cargowise_id)
        .filter((id): id is string => typeof id === 'string')

      const { data: existingRows, error: existingFetchError } = await supabase
        .from('shipments')
        .select('cargowise_id')
        .in('cargowise_id', cargowiseIds)

      if (existingFetchError) {
        throw new Error(`Failed to load existing shipments: ${existingFetchError.message}`)
      }

      const existingIds = new Set((existingRows ?? []).map((row) => row.cargowise_id))
      inserted = cargowiseIds.filter((id) => !existingIds.has(id)).length
      updated = cargowiseIds.length - inserted

      const now = new Date().toISOString()
      const upsertPayload = mappedRecords.map((record) => {
        const id = record.cargowise_id as string
        return existingIds.has(id) ? record : { ...record, created_at: now }
      })

      const { error: upsertError } = await supabase
        .from('shipments')
        .upsert(upsertPayload, { onConflict: 'cargowise_id' })

      if (upsertError) {
        errors += mappedRecords.length
        errorDetails.push({
          shipment_id: 'bulk_upsert',
          field: 'upsert',
          reason: upsertError.message,
          timestamp: new Date().toISOString(),
        })
        inserted = 0
        updated = 0
      }
    }

    // Step 5 - Log sync result
    await supabase.from('sync_logs').insert({
      status: errors > 0 && (inserted + updated) > 0 ? 'partial' :
              errors > 0 ? 'failed' : 'success',
      records_added: inserted,
      records_updated: updated,
      error_count: errors,
      synced_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      errors,
      errorDetails,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
