from flask import request
from services.supabase_service import get_supabase
from datetime import datetime
import requests


def get_location_from_ip(ip):
    if not ip or ip in ['127.0.0.1', '::1', 'localhost', 'Unknown']:
        return "Localhost"
    try:
        req = requests.get(f'http://ip-api.com/json/{ip}?fields=city,country', timeout=3)
        data = req.json()
        if data.get('status') == 'success':
            return f"{data.get('city')}, {data.get('country')}"
    except Exception:
        pass
    return "Unknown"


def get_device_info(user_agent):
    if not user_agent:
        return "Unknown"
    browser = user_agent.browser or "Unknown Browser"
    platform = user_agent.platform or "Unknown OS"
    return f"{browser} on {platform}".title()


def log_access_event(action, status='Success', email_attempted=None, user_id=None):
    """Insert a row into access_logs. Mirrors the Login/Failed-Login logging
    in routes/auth.py, so the Access Logs page's Action filter (Logout,
    Create, Update, Delete) has real rows to match against."""
    try:
        supabase = get_supabase()
        record = {
            'action': action,
            'ip_address': request.remote_addr or 'Unknown',
            'location': get_location_from_ip(request.remote_addr),
            'device': get_device_info(request.user_agent),
            'status': status,
            'email_attempted': email_attempted,
            'timestamp': datetime.utcnow().isoformat(),
        }
        if user_id:
            record['user_id'] = user_id
        supabase.table('access_logs').insert(record).execute()
    except Exception as log_err:
        print(f"Failed to record access log: {log_err}")
