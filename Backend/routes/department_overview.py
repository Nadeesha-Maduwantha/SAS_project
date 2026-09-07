"""department_overview.py — route for the admin Department Overview page."""

from flask import Blueprint, request, jsonify
from services.department_overview import build_department_overview

department_overview_bp = Blueprint('department_overview', __name__)


@department_overview_bp.route('/api/dashboard/department-overview', methods=['GET'])
def department_overview():
    try:
        dept = request.args.get('dept', 'Operations')
        return jsonify({'data': build_department_overview(dept)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
