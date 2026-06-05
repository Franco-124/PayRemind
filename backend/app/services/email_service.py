import logging

import resend

from app.config import settings
from app.templates.email_template import build_email_html

logger = logging.getLogger(__name__)


def send_invoice_email(
    to: str,
    client_name: str,
    freelancer_name: str,
    invoice_number: str,
    total: float,
    currency: str,
    due_date: str,
    pdf_bytes: bytes,
) -> bool:
    """Send the initial invoice email to a client with the PDF attached.

    Returns True on success, False on failure. Never raises.
    """
    try:
        logger.info("Sending invoice email to %s (invoice %s)", to, invoice_number)
        resend.api_key = settings.resend_api_key

        subject = f"Factura {invoice_number} de {freelancer_name}"
        body = (
            f"Hola {client_name},\n\n"
            f"Adjunto encontrarás la factura {invoice_number} "
            f"por un total de {total:,.2f} {currency}.\n"
            f"Fecha de vencimiento: {due_date}.\n\n"
            f"Cualquier consulta, no dudes en contactarme.\n\n"
            f"Saludos,\n{freelancer_name}"
        )

        import base64
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

        response = resend.Emails.send({
            "from": "PayRemind <reminders@revoluciona.online>",
            "to": [to],
            "subject": subject,
            "text": body,
            "html": f"<pre style='font-family:sans-serif'>{body}</pre>",
            "attachments": [
                {
                    "filename": f"factura-{invoice_number}.pdf",
                    "content": pdf_b64,
                }
            ],
        })
        logger.info("Invoice email sent -> %s | response: %s", to, response)
        return True
    except Exception as e:
        logger.error("Invoice email error: %s", e)
        return False


def send_email(
    to: str,
    subject: str,
    body: str,
    freelancer_name: str = "",
    client_name: str = "",
    invoice_number: str = "",
    amount: float = 0,
    currency: str = "USD",
    days_overdue: int = 0,
    tone: str = "friendly",
) -> bool:
    """Send an email via Resend API with an HTML template.

    Returns True on success, False on failure.
    Never raises — a failed email must not break the caller's flow.
    """
    try:
        logger.info("Attempting to send email to %s", to)
        logger.info("Resend API key exists: %s", bool(settings.resend_api_key))
        resend.api_key = settings.resend_api_key

        html_body = build_email_html(
            freelancer_name=freelancer_name,
            client_name=client_name,
            invoice_number=invoice_number,
            amount=amount,
            currency=currency,
            days_overdue=days_overdue,
            tone=tone,
            body=body,
        )

        response = resend.Emails.send({
            "from": "PayRemind <reminders@revoluciona.online>",
            "to": [to],
            "subject": subject,
            "html": html_body,
            "text": body,
        })
        logger.info("Resend response: %s", response)
        logger.info("sent -> %s | %s", to, subject)
        return True
    except Exception as e:
        logger.error("Email error: %s", str(e))
        logger.error("FAILED -> %s | %s", to, subject)
        return False
