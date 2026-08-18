import os
import ssl
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

DEFAULT_SMTP_PORT = 587


def get_email_config():
    host = os.getenv('SMTP_HOST')
    port = int(os.getenv('SMTP_PORT', DEFAULT_SMTP_PORT))
    user = os.getenv('SMTP_USER')
    password = os.getenv('SMTP_PASS')
    from_address = os.getenv('EMAIL_FROM') or user

    if not host:
        raise EnvironmentError('SMTP_HOST environment variable is required for sending email.')
    if not user or not password:
        raise EnvironmentError('SMTP_USER and SMTP_PASS environment variables are required for sending email.')
    if not from_address:
        raise EnvironmentError('EMAIL_FROM environment variable is required for sending email.')

    return host, port, user, password, from_address


def send_email(to_address: str, subject: str, body: str, html_body: str = None):
    if not to_address:
        raise ValueError('Recipient email address is required.')

    host, port, user, password, from_address = get_email_config()

    message = EmailMessage()
    message['From'] = from_address
    message['To'] = to_address
    message['Subject'] = subject
    message.set_content(body)

    if html_body:
        message.add_alternative(html_body, subtype='html')

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=30) as server:
            server.login(user, password)
            server.send_message(message)
    else:
        context = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.starttls(context=context)
            server.login(user, password)
            server.send_message(message)

    return True
