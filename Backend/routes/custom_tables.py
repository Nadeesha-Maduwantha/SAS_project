from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
from utils.auth_helper import require_auth, get_current_user


custom_tables_bp = Blueprint('custom_tables', __name__)


# ── GET all saved tables for the logged-in user ───────────────────────────────
@custom_tables_bp.route('/api/custom-tables', methods=['GET'])
@require_auth
def get_custom_tables():
    try:
        user_id, _ = get_current_user()

        response = (
            supabase.table('custom_table_views')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', desc=False)
            .execute()
        )
        return jsonify({'data': response.data or []}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── POST create a new saved table ─────────────────────────────────────────────
@custom_tables_bp.route('/api/custom-tables', methods=['POST'])
@require_auth
def create_custom_table():
    try:
        user_id, _ = get_current_user()
        data = request.get_json()

        name        = data.get('name', '').strip()
        data_source = data.get('data_source')   # 'shipments' or 'alerts'
        filters     = data.get('filters', {})   # JSONB: { consignee_name, transport_mode, etc. }

        if not name:
            return jsonify({'error': 'Table name is required'}), 400
        if data_source not in ('shipments', 'alerts'):
            return jsonify({'error': 'data_source must be "shipments" or "alerts"'}), 400

        insert_resp = (
            supabase.table('custom_table_views')
            .insert({
                'user_id':     user_id,
                'name':        name,
                'data_source': data_source,
                'filters':     filters,
                'pinned_to_dashboard': False,   # dashboard pin — wired up later
            })
            .execute()
        )
        return jsonify({'data': insert_resp.data[0]}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── DELETE a saved table (only owner can delete) ──────────────────────────────
@custom_tables_bp.route('/api/custom-tables/<table_id>', methods=['DELETE'])
@require_auth
def delete_custom_table(table_id):
    try:
        user_id, _ = get_current_user()

        # Verify ownership before deleting
        check = (
            supabase.table('custom_table_views')
            .select('id')
            .eq('id', table_id)
            .eq('user_id', user_id)
            .execute()
        )
        if not check.data:
            return jsonify({'error': 'Table not found or access denied'}), 404

        supabase.table('custom_table_views').delete().eq('id', table_id).execute()
        return jsonify({'message': 'Table deleted'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── PATCH toggle dashboard pin (placeholder — connected in future sprint) ─────
@custom_tables_bp.route('/api/custom-tables/<table_id>/pin', methods=['PATCH'])
@require_auth
def toggle_pin(table_id):
    try:
        user_id, _ = get_current_user()
        data = request.get_json()
        pinned = bool(data.get('pinned', False))

        check = (
            supabase.table('custom_table_views')
            .select('id')
            .eq('id', table_id)
            .eq('user_id', user_id)
            .execute()
        )
        if not check.data:
            return jsonify({'error': 'Table not found or access denied'}), 404

        supabase.table('custom_table_views') \
            .update({'pinned_to_dashboard': pinned}) \
            .eq('id', table_id) \
            .execute()

        return jsonify({'message': f'Table {"pinned to" if pinned else "unpinned from"} dashboard'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── GET execute a saved table's filters and return live rows ──────────────────
@custom_tables_bp.route('/api/custom-tables/<table_id>/data', methods=['GET'])
@require_auth
def get_custom_table_data(table_id):
    """
    Reads the saved JSONB filters for this table and builds a
    dynamic Supabase query against shipments or shipment_milestones.
    """
    try:
        user_id, _ = get_current_user()

        # Load the saved table config
        table_resp = (
            supabase.table('custom_table_views')
            .select('*')
            .eq('id', table_id)
            .eq('user_id', user_id)
            .single()
            .execute()
        )
        if not table_resp.data:
            return jsonify({'error': 'Table not found or access denied'}), 404

        config      = table_resp.data
        data_source = config['data_source']
        filters     = config.get('filters') or {}

        # ── SHIPMENTS source ──────────────────────────────────────────────────
        if data_source == 'shipments':
            query = supabase.table('shipments').select(
                'id, job_number, consignee_name, transport_mode, '
                'branch, pickup_date_status, llm_identified_type, '
                'current_stage, created_at'
            )

            # Apply each saved filter if it has a non-empty value
            if filters.get('consignee_name'):
                query = query.ilike('consignee_name', f"%{filters['consignee_name']}%")

            if filters.get('transport_mode'):
                query = query.eq('transport_mode', filters['transport_mode'].upper())

            if filters.get('branch'):
                query = query.ilike('branch', f"%{filters['branch']}%")

            if filters.get('pickup_status'):
                query = query.eq('pickup_date_status', filters['pickup_status'])

            rows = query.order('created_at', desc=True).execute()
            return jsonify({'data': rows.data or [], 'source': 'shipments'}), 200

        # ── ALERTS source (shipment_milestones) ───────────────────────────────
        elif data_source == 'alerts':
            query = supabase.table('shipment_milestones').select(
                'id, shipment_id, name, status, is_critical, '
                'due_date, completed_date, notes, assigned_to, '
                'assigned_email, alert_sent, created_at'
            )

            if filters.get('priority') == 'Critical':
                query = query.eq('is_critical', True)
            elif filters.get('priority') == 'Non-Critical':
                query = query.eq('is_critical', False)

            if filters.get('alert_status'):
                query = query.eq('status', filters['alert_status'])

            # For company filter on alerts we join via shipment_id
            # We do a two-step: first get matching shipment ids, then filter
            if filters.get('consignee_name'):
                ship_resp = (
                    supabase.table('shipments')
                    .select('id')
                    .ilike('consignee_name', f"%{filters['consignee_name']}%")
                    .execute()
                )
                ids = [s['id'] for s in (ship_resp.data or [])]
                if ids:
                    query = query.in_('shipment_id', ids)
                else:
                    # No matching shipments — return empty
                    return jsonify({'data': [], 'source': 'alerts'}), 200

            if filters.get('transport_mode'):
                ship_resp = (
                    supabase.table('shipments')
                    .select('id')
                    .eq('transport_mode', filters['transport_mode'].upper())
                    .execute()
                )
                ids = [s['id'] for s in (ship_resp.data or [])]
                if ids:
                    query = query.in_('shipment_id', ids)
                else:
                    return jsonify({'data': [], 'source': 'alerts'}), 200

            rows = query.order('created_at', desc=True).execute()
            return jsonify({'data': rows.data or [], 'source': 'alerts'}), 200

        else:
            return jsonify({'error': 'Unknown data source'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500