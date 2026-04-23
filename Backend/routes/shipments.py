from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

shipments_bp = Blueprint('shipments', __name__)

@shipments_bp.route('/api/shipments', methods=['GET'])
def get_all_shipments():
    try:
        response = (
            supabase.table('shipments')
            .select(
                'id, job_number, house_bill_number, transport_mode, branch,'
                'consignee_name, consignee_email, consignee_contact,'
                'origin_city, origin_country_code,'
                'destination_city, destination_country_code,'
                'current_stage, carrier, estimated_arrival, delivery_date,'
                'is_priority, delay_reason, delay_days, transit_days,'
                'cargo_ready_date, cargo_pickup_date, pickup_date_status,'
                'llm_identified_type, llm_note, llm_cargo_pickup_date,'
                'st_description, st_note_text,'
                'created_by_name, created_by_email,'
                'sales_user_name, sales_user_email,'
                'created_at, updated_at, running_date_time'
            )
            .order('created_at', desc=True)
            .execute()
        )
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@shipments_bp.route('/api/shipments/<shipment_id>', methods=['GET'])
def get_shipment(shipment_id):
    try:
        shipment_response = (
            supabase.table('shipments')
            .select('*')
            .eq('id', shipment_id)
            .single()
            .execute()
        )
        if not shipment_response.data:
            return jsonify({"error": "Shipment not found"}), 404

        milestones_response = (
            supabase.table('shipment_milestones')
            .select('*')
            .eq('shipment_id', shipment_id)
            .order('sequence_order')
            .execute()
        )

        return jsonify({
            "data": {
                "shipment":  shipment_response.data,
                "milestones": milestones_response.data or []
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@shipments_bp.route('/api/shipments/job/<job_number>', methods=['GET'])
def get_shipment_by_job(job_number):
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('job_number', job_number)
            .single()
            .execute()
        )
        if not response.data:
            return jsonify({"error": "Shipment not found"}), 404
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@shipments_bp.route('/api/shipments/<shipment_id>/assign-template/<template_id>', methods=['POST'])
def assign_template(shipment_id, template_id):
    try:
        template_milestones = (
            supabase.table('template_milestones')
            .select('*')
            .eq('template_id', template_id)
            .order('sequence_order')
            .execute()
        )

        rows = []
        for m in template_milestones.data:
            rows.append({
                'shipment_id':       shipment_id,
                'template_id':       template_id,
                'name':              m['name'],
                'sequence_order':    m['sequence_order'],
                'status':            'pending',
                'automated':         m.get('automated', False),
                'days_from_booking': m.get('sequence_order', 0),
            })

        supabase.table('shipment_milestones').insert(rows).execute()
        return jsonify({"message": "Template assigned successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500