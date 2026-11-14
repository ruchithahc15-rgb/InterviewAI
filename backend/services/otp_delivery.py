import base64
import os
import smtplib
from email.message import EmailMessage
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def reset_delivery_configured(is_email: bool) -> bool:
    if is_email:
        return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM_EMAIL"))
    return bool(
        os.getenv("TWILIO_ACCOUNT_SID")
        and os.getenv("TWILIO_AUTH_TOKEN")
        and (os.getenv("TWILIO_FROM_NUMBER") or os.getenv("TWILIO_MESSAGING_SERVICE_SID"))
    )


def send_email_code(destination: str, code: str) -> None:
    host = os.getenv("SMTP_HOST")
    sender = os.getenv("SMTP_FROM_EMAIL")
    if not host or not sender:
        raise RuntimeError("Email delivery is not configured")

    port = int(os.getenv("SMTP_PORT", "587"))
    message = EmailMessage()
    message["Subject"] = "Your InterviewAI password reset code"
    message["From"] = sender
    message["To"] = destination
    message.set_content(
        f"Your InterviewAI password reset code is {code}. "
        "It expires in 10 minutes. If you did not request this, you can ignore this message."
    )

    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                if username:
                    server.login(username, password or "")
                server.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.starttls()
                if username:
                    server.login(username, password or "")
                server.send_message(message)
    except (OSError, smtplib.SMTPException, ValueError) as error:
        raise RuntimeError("Email provider could not deliver the code") from error


def send_sms_code(destination: str, code: str) -> None:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")
    service_sid = os.getenv("TWILIO_MESSAGING_SERVICE_SID")
    if not account_sid or not auth_token or not (from_number or service_sid):
        raise RuntimeError("SMS delivery is not configured")

    payload = {"To": destination, "Body": f"Your InterviewAI password reset code is {code}. It expires in 10 minutes."}
    payload["MessagingServiceSid" if service_sid else "From"] = service_sid or from_number
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        data=urlencode(payload).encode("utf-8"),
        headers={"Authorization": "Basic " + base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            if response.status >= 300:
                raise RuntimeError("SMS provider rejected the request")
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError("SMS provider could not deliver the code") from error


def deliver_reset_code(destination: str, code: str, is_email: bool) -> None:
    if is_email:
        send_email_code(destination, code)
    else:
        send_sms_code(destination, code)
