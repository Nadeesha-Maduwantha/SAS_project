"""
email_service.py — outbound email for the backend.

Delivery goes through the SAS frontend's existing Nodemailer route
(`SAS/app/api/email/send/route.ts`) so every message in the system — the ones a
user composes in the communication centre and the ones the alert engine sends
automatically — leaves through the same SMTP configuration. Nothing new to
configure if the frontend already sends email.

If the frontend isn't reachable and SMTP credentials are present in the backend
environment, it falls back to sending directly over SMTP.

Environment (all optional):
  SAS_EMAIL_ENDPOINT   URL of the Next.js send route
                       (default http://localhost:3000/api/email/send)
  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM / SMTP_SECURE
                       fallback direct-SMTP settings

`services/field_registry.py` already imports `send_email` from this module for
its field-mismatch digest; that import now resolves.
"""

import json
import os
import smtplib
import ssl
import time
import urllib.error
import urllib.request
from email.message import EmailMessage

DEFAULT_ENDPOINT = 'http://localhost:3000/api/email/send'
REQUEST_TIMEOUT  = 20
FRONTEND_ATTEMPTS = 2   # a mid-request connection reset (e.g. dev-server hot reload) gets one retry


def _as_list(value) -> list:
    if not value:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    return [str(v).strip() for v in value if str(v).strip()]


def _html_from_text(text: str) -> str:
    body = (text or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return ('<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
            f'white-space:pre-wrap">{body}</div>')


def send_email(to, subject: str, text: str, html: str | None = None,
               cc=None, bcc=None) -> dict:
    """
    Send one message. `to` may be a string or a list.
    Returns {'sent': True, 'via': 'frontend'|'smtp'}; raises on total failure so
    the caller can record the error.
    """
    recipients = _as_list(to)
    if not recipients:
        raise ValueError('No recipients')
    if not (subject or '').strip():
        raise ValueError('Subject is required')

    body_html = html or _html_from_text(text)

    try:
        _send_via_frontend(recipients, subject, text, body_html,
                           _as_list(cc), _as_list(bcc))
        return {'sent': True, 'via': 'frontend', 'recipients': recipients}
    except Exception as frontend_error:
        if not os.getenv('SMTP_HOST'):
            raise RuntimeError(
                f"email send failed via {_endpoint()}: {frontend_error}. "
                f"Start the SAS frontend, set SAS_EMAIL_ENDPOINT, or configure "
                f"SMTP_HOST/SMTP_USER/SMTP_PASS in the backend .env."
            ) from frontend_error
        _send_via_smtp(recipients, subject, text, body_html,
                       _as_list(cc), _as_list(bcc))
        return {'sent': True, 'via': 'smtp', 'recipients': recipients}


def _endpoint() -> str:
    return os.getenv('SAS_EMAIL_ENDPOINT', DEFAULT_ENDPOINT)


def _send_via_frontend(to, subject, text, html, cc, bcc) -> None:
    payload = json.dumps({
        'to': to, 'cc': cc, 'bcc': bcc,
        'subject': subject, 'html': html, 'text': text,
    }).encode('utf-8')

    request = urllib.request.Request(
        _endpoint(), data=payload, method='POST',
        headers={'Content-Type': 'application/json'},
    )

    for attempt in range(1, FRONTEND_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
                if response.status >= 300:
                    raise RuntimeError(f'HTTP {response.status}')
            return
        except urllib.error.HTTPError as e:
            detail = e.read().decode('utf-8', 'replace')[:300]
            raise RuntimeError(f'HTTP {e.code}: {detail}') from e
        except (urllib.error.URLError, OSError) as e:
            # Connection dropped mid-request (e.g. dev-server hot reload) rather than
            # a real HTTP failure — worth one retry before giving up.
            if attempt == FRONTEND_ATTEMPTS:
                raise RuntimeError(f'connection to {_endpoint()} failed: {e}') from e
            time.sleep(1)


def _send_via_smtp(to, subject, text, html, cc, bcc) -> None:
    host   = os.getenv('SMTP_HOST')
    port   = int(os.getenv('SMTP_PORT') or 587)
    user   = os.getenv('SMTP_USER')
    passwd = os.getenv('SMTP_PASS')
    sender = os.getenv('SMTP_FROM') or user
    secure = (os.getenv('SMTP_SECURE') or '').lower() == 'true'

    if not host or not sender:
        raise RuntimeError('SMTP is not configured (SMTP_HOST / SMTP_FROM)')

    message = EmailMessage()
    message['From']    = sender
    message['To']      = ', '.join(to)
    if cc:
        message['Cc']  = ', '.join(cc)
    message['Subject'] = subject
    message.set_content(text or '')
    message.add_alternative(html, subtype='html')

    context = ssl.create_default_context()
    if secure:
        server = smtplib.SMTP_SSL(host, port, context=context, timeout=REQUEST_TIMEOUT)
    else:
        server = smtplib.SMTP(host, port, timeout=REQUEST_TIMEOUT)
    try:
        if not secure:
            try:
                server.starttls(context=context)
            except smtplib.SMTPException:
                pass                      # server doesn't offer STARTTLS
        if user and passwd:
            server.login(user, passwd)
        server.send_message(message, to_addrs=list(to) + list(cc) + list(bcc))
    finally:
        try:
            server.quit()
        except Exception:
            pass
