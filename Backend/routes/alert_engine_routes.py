"""
alert_engine_routes.py — manual controls for the runtime alert engine.

The engine normally runs on the scheduler (see app.py). These endpoints let an
admin preview what it currently sees and trigger a pass on demand — useful when
testing a newly built milestone without waiting for the next scheduled run.

  GET  /api/alert-engine/preview                     what the engine sees now (no sends)
  GET  /api/alert-engine/preview?shipment_id=<id>    one shipment
  GET  /api/alert-engine/evaluate/<milestone_id>     one milestone, in detail
  POST /api/alert-engine/run                         run a pass
       body: { "dry_run": true|false,
               "shipment_id": "<id>",       optional
               "milestone_id": "<id>",      optional
               "catch_up": true|false }     send every missed occurrence
"""

from flask import Blueprint, jsonify, request

from services.alert_engine import (
    evaluate_row, preview_alerts, previous_milestone, run_alert_engine,
)
from services.supabase_client import supabase
from utils.auth_helper import require_auth, get_current_user

alert_engine_bp = Blueprint('alert_engine', __name__)


def _admin_only():
    """Returns an error response when the caller isn't an admin, else None."""
    _, role = get_current_user()
    if 'admin' not in (role or '').lower():
        return jsonify({'error': 'Admin access required'}), 403
    return None


@alert_engine_bp.route('/api/alert-engine/preview', methods=['GET'])
@require_auth
def preview():
    try:
        return jsonify(preview_alerts(
            shipment_id=request.args.get('shipment_id'),
            milestone_id=request.args.get('milestone_id'),
        )), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alert_engine_bp.route('/api/alert-engine/evaluate/<milestone_id>', methods=['GET'])
@require_auth
def evaluate_one(milestone_id):
    try:
        row = (
            supabase.table('shipment_milestones')
            .select('*').eq('id', milestone_id).single().execute()
        ).data
        if not row:
            return jsonify({'error': 'Milestone not found'}), 404
        if not row.get('milestone_snapshot'):
            return jsonify({'error': 'This milestone has no builder snapshot — '
                                     'it was created by the legacy sync, not the '
                                     'milestone builder.'}), 400

        shipment = (
            supabase.table('shipments')
            .select('*').eq('id', row['shipment_id']).single().execute()
        ).data or {}

        siblings = (
            supabase.table('shipment_milestones')
            .select('id, sequence_order, completed_date, status')
            .eq('shipment_id', row['shipment_id'])
            .order('sequence_order').execute()
        ).data or []

        detail = evaluate_row(row, shipment, siblings)
        previous = previous_milestone(siblings, row)
        detail['previous_milestone'] = {
            'id':             previous.get('id'),
            'sequence_order': previous.get('sequence_order'),
            'completed_date': previous.get('completed_date'),
        } if previous else None

        history = (
            supabase.table('alert_fire_log')
            .select('rule_index, occurrence, status, recipient_email, fired_at, error')
            .eq('shipment_milestone_id', milestone_id)
            .order('fired_at', desc=True).limit(50).execute()
        ).data or []
        detail['fire_history'] = history

        return jsonify({'data': detail}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alert_engine_bp.route('/api/alert-engine/run', methods=['POST'])
@require_auth
def run():
    denied = _admin_only()
    if denied:
        return denied
    try:
        body = request.get_json(silent=True) or {}
        return jsonify(run_alert_engine(
            dry_run=bool(body.get('dry_run', False)),
            shipment_id=body.get('shipment_id'),
            milestone_id=body.get('milestone_id'),
            catch_up=bool(body.get('catch_up', False)),
        )), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alert_engine_bp.route('/api/alert-engine/history', methods=['GET'])
@require_auth
def history():
    """Recent firings across the system — feeds an admin 'what went out' view."""
    try:
        limit = min(int(request.args.get('limit', 100)), 500)
        query = (
            supabase.table('alert_fire_log')
            .select('*').order('fired_at', desc=True).limit(limit)
        )
        shipment_id = request.args.get('shipment_id')
        if shipment_id:
            query = query.eq('shipment_id', shipment_id)
        rows = query.execute().data or []
        return jsonify({'data': rows, 'total': len(rows)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
