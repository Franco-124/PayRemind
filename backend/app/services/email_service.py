import resend

from app.config import settings


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an email via Resend API.

    Returns True on success, False on failure.
    Never raises — a failed email must not break the caller's flow.
    """
    try:
        print(f"[email_service] Attempting to send email to {to}")
        print(f"[email_service] Resend API key exists: {bool(settings.resend_api_key)}")
        resend.api_key = settings.resend_api_key
        response = resend.Emails.send({
            "from": "PayRemind <onboarding@resend.dev>",
            "to": [to],
            "subject": subject,
            "html": body.replace("\n", "<br>"),
        })
        print(f"[email_service] Resend response: {response}")
        print(f"[email_service] sent -> {to} | {subject}")
        return True
    except Exception as e:
        print(f"[email_service] Email error: {str(e)}")
        print(f"[email_service] FAILED -> {to} | {subject}")
        return False
