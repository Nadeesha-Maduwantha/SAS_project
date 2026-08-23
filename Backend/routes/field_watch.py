"""
field_watch.py — endpoints for the Field Integrity / Registry Watch module.

Separate from the milestone alert engine. Surfaces "expected data field delayed /
possibly renamed" alerts and lets an admin run the scan on demand.
"""

from flask import Blueprint, jsonify, request
from services.field_watch import (
    scan_field_alerts, list_field_alerts,
    list_field_conflicts, resolve_field_conflict,
)

field_watch_bp = Blueprint('field_watch', __name__)


@field_watch_bp.route('/api/field-watch/scan', methods=['GET', 'POST'])
def run_scan():
    try:
        return jsonify({'message': 'Scanned', 'result': scan_field_alerts()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@field_watch_bp.route('/api/field-watch/alerts', methods=['GET'])
def get_alerts():
    try:
        data = list_field_alerts()
        return jsonify({'data': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@field_watch_bp.route('/api/field-watch/conflicts', methods=['GET'])
def get_conflicts():
    """Naming mismatches deduped + grouped by template (for the Resolve tab)."""
    try:
        data = list_field_conflicts()
        return jsonify({'data': data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@field_watch_bp.route('/api/field-watch/resolve', methods=['POST'])
def resolve_conflict():
    """Map one mismatch to the real field and clear every shipment it affects.
    Body: { expected_field, real_field, milestone_key? }.
    Omit milestone_key to resolve this field everywhere it appears."""
    try:
        body = request.get_json(silent=True) or {}
        result = resolve_field_conflict(
            expected_field=(body.get('expected_field') or '').strip(),
            real_field=(body.get('real_field') or '').strip(),
            milestone_key=(body.get('milestone_key') or None),
        )
        code = 400 if result.get('error') else 200
        return jsonify(result), code
    except Exception as e:
        return jsonify({'error': str(e)}), 500
