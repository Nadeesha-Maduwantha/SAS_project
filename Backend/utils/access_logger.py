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


def is_new_device(user_id, device):
    """True if this user has no prior successful-login access_logs row from
    this device string. Used to gate the "new device login" notification —
    fails closed (False) on any lookup error, so a DB hiccup can't spam a
    notification for what might be a perfectly familiar device."""
    if not user_id or not device:
        return False
    try:
        supabase = get_supabase()
        resp = (
            supabase.table('access_logs')
            .select('id')
            .eq('user_id', user_id)
            .eq('device', device)
            .eq('action', 'Login')
            .eq('status', 'Success')
            .limit(1)
            .execute()
        )
        return not resp.data
    except Exception as e:
        print(f"is_new_device lookup failed: {e}")
        return False


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


def is_new_device(user_id, device):
    """True if this user has no prior successful Login access_logs row with
    this device string. Returns False on a user's very first login (nothing
    to compare against yet) and on any lookup failure, so a query error never
    misfires a false 'new device' notification."""
    try:
        supabase = get_supabase()
        rows = (
            supabase.table('access_logs')
            .select('device')
            .eq('user_id', user_id)
            .eq('action', 'Login')
            .eq('status', 'Success')
            .execute()
        ).data or []
        return bool(rows) and device not in {r.get('device') for r in rows}
    except Exception:
        return False


def is_new_ip(user_id, ip_address):
    """True if this user's most recent successful Login used a different IP
    address than the current one — specifically the last login, not 'ever
    seen before'. False if there's no prior login to compare against, or on
    any lookup failure."""
    try:
        supabase = get_supabase()
        rows = (
            supabase.table('access_logs')
            .select('ip_address')
            .eq('user_id', user_id)
            .eq('action', 'Login')
            .eq('status', 'Success')
            .order('timestamp', desc=True)
            .limit(1)
            .execute()
        ).data or []
        if not rows:
            return False
        return rows[0].get('ip_address') != ip_address
    except Exception:
        return False
