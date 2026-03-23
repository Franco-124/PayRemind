import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an email via Resend API.

    Returns True on success, False on failure.
    Never raises — a failed email must not break the caller's flow.
    """
    try:
        logger.info("Attempting to send email to %s", to)
        logger.info("Resend API key exists: %s", bool(settings.resend_api_key))
        resend.api_key = settings.resend_api_key
        response = resend.Emails.send({
            "from": "PayRemind <onboarding@resend.dev>",
            "to": [to],
            "subject": subject,
            "html": body.replace("\n", "<br>"),
        })
        logger.info("Resend response: %s", response)
        logger.info("sent -> %s | %s", to, subject)
        return True
    except Exception as e:
        logger.error("Email error: %s", str(e))
        logger.error("FAILED -> %s | %s", to, subject)
        return False
