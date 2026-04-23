import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

async function fetchShipments(token: string) {
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

function validateRecord(record: any): string[] {
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
    const errorDetails: any[] = []

    // Step 3 - Process each record
    for (const record of shipments) {
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

      // Step 4 - Check if exists
      const { data: existing } = await supabase
        .from('shipments')
        .select('id')
        .eq('cargowise_id', record.job_number)
        .single()

      const mappedRecord = {
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
      }

      if (existing) {
        await supabase
          .from('shipments')
          .update(mappedRecord)
          .eq('cargowise_id', record.job_number)
        updated++
      } else {
        const { error: insertError } = await supabase
  .from('shipments')
  .insert({ ...mappedRecord, created_at: new Date().toISOString() })
if (insertError) {
  console.error('Insert error:', insertError.message)
  errors++
  errorDetails.push({
    shipment_id: record.job_number ?? 'unknown',
    field: 'insert',
    reason: insertError.message,
    timestamp: new Date().toISOString(),
  })
} else {
  inserted++
}
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

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}