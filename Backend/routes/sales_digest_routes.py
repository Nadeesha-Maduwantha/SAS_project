"""
sales_digest_routes.py — manual control for the sales-user digest emails.

The digest normally runs on the scheduler (see app.py, 8:00 AM Asia/Colombo).
This endpoint lets an admin trigger a pass on demand — useful when testing
without waiting for the next scheduled run.

  POST /api/sales-digest/run
       body: { "dry_run": true|false }   dry_run counts emails without sending
  GET  /api/sales-digest/history         recent sends — feeds the admin 'sent emails' view
       ?limit=100&sales_email=<email>&kind=overdue|reminder
"""

from flask import Blueprint, jsonify, request

from services.sales_digest import run_sales_digest
from services.supabase_client import supabase
from utils.auth_helper import require_auth, get_current_user

sales_digest_bp = Blueprint('sales_digest', __name__)


def _admin_only():
    _, role = get_current_user()
    if 'admin' not in (role or '').lower():
        return jsonify({'error': 'Admin access required'}), 403
    return None


@sales_digest_bp.route('/api/sales-digest/run', methods=['POST'])
@require_auth
def run():
    denied = _admin_only()
    if denied:
        return denied
    try:
        body = request.get_json(silent=True) or {}
        return jsonify(run_sales_digest(dry_run=bool(body.get('dry_run', False)))), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_digest_bp.route('/api/sales-digest/history', methods=['GET'])
@require_auth
def history():
    """Recent sales-digest email sends — feeds an admin 'what went out' view."""
    try:
        limit = min(int(request.args.get('limit', 100)), 500)
        query = (
            supabase.table('sales_digest_log')
            .select('*').order('sent_at', desc=True).limit(limit)
        )
        sales_email = request.args.get('sales_email')
        if sales_email:
            query = query.eq('sales_email', sales_email)
        kind = request.args.get('kind')
        if kind:
            query = query.eq('kind', kind)
        rows = query.execute().data or []
        return jsonify({'data': rows, 'total': len(rows)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
