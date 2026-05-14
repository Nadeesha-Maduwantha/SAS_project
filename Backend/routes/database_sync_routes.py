# routes/sync_routes.py
#
# Flask routes for the sync system.
# These let you trigger syncs manually and view the sync log history.
#
# Routes:
#   POST /api/sync/milestones      — trigger a milestone sync now
#   GET  /api/sync/logs            — view recent sync history
#   GET  /api/sync/logs/latest     — view the most recent sync result

from flask import Blueprint, jsonify
from sync.milestone_sync import run_milestone_sync
from sync.database_sync_log import get_recent_logs, get_last_sync

sync_bp = Blueprint('sync', __name__)


# =============================================================
#  POST /api/sync/milestones
#
#  Triggers a full milestone sync immediately.
#  Call this:
#    - After your CargoWise sync script finishes
#    - From the admin dashboard "Sync Now" button
#    - Any time you want to refresh milestone data
#
#  Safe to call repeatedly — never duplicates rows.
# =============================================================
@sync_bp.route('/api/sync/milestones', methods=['POST'])
def trigger_milestone_sync():
    result = run_milestone_sync()

    # Return appropriate HTTP status based on result
    # 200 = success or partial (some worked)
    # 500 = complete failure
    if result['status'] == 'failed':
        return jsonify(result), 500

    return jsonify(result), 200


# =============================================================
#  GET /api/sync/logs
#  Returns recent sync log history — last 20 runs by default
#  Add ?limit=50 to get more
# =============================================================
@sync_bp.route('/api/sync/logs', methods=['GET'])
def get_sync_logs():
    from flask import request
    limit = int(request.args.get('limit', 20))
    logs  = get_recent_logs(limit=limit)
    return jsonify({"data": logs}), 200


# =============================================================
#  GET /api/sync/logs/latest
#  Returns just the most recent completed sync
#  Useful for dashboard status indicator: "Last synced 5 min ago"
# =============================================================
@sync_bp.route('/api/sync/logs/latest', methods=['GET'])
def get_latest_sync_log():
    log = get_last_sync('database_sync')
    return jsonify({"data": log}), 200