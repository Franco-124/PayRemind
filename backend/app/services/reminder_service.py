import logging
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger(__name__)

from app.config import settings
from app.models.email_log import EmailLog
from app.models.invoice import Invoice
from app.services.email_service import send_email

_TONE_MAP: dict[int, str] = {3: "friendly", 7: "firm", 14: "final"}

_SYSTEM_PROMPT = (
    "Eres un asistente que redacta emails de cobro profesionales para freelancers. "
    "Respondes SOLO con el email, sin explicaciones adicionales.\n"
    "Formato estricto:\n"
    "Subject: [asunto]\n\n"
    "[cuerpo del email]"
)

_TONE_INSTRUCTIONS: dict[str, str] = {
    "friendly": "Tono amable. Asume que fue un olvido y que el cliente pagará pronto.",
    "firm": "Tono directo y profesional. Menciona explícitamente los días vencidos.",
    "final": (
        "Tono serio. Indica que es un último recordatorio y menciona "
        "que se tomarán próximos pasos si no se recibe el pago."
    ),
}


def get_tone_for_day(days_overdue: int) -> str:
    """Map a days-overdue value to a tone string."""
    return _TONE_MAP.get(days_overdue, "firm")


def generate_email_content(
    freelancer_name: str,
    client_name: str,
    amount: float,
    currency: str,
    invoice_number: str,
    days_overdue: int,
    tone: str,
) -> tuple[str, str]:
    """Generate email subject and body using GPT-4o-mini.

    Falls back to a generic template if the OpenAI call fails.
    """
    fallback_subject = f"Recordatorio de pago pendiente - {invoice_number}"
    fallback_body = (
        f"Hola {client_name}, te recordamos que la factura {invoice_number} "
        f"por {amount} {currency} está pendiente de pago. "
        "Por favor contáctanos."
    )

    try:
        from openai import OpenAI  # lazy import — avoids proxy resolution at startup
        client = OpenAI(api_key=settings.openai_api_key)
        tone_instruction = _TONE_INSTRUCTIONS.get(tone, _TONE_INSTRUCTIONS["firm"])
        user_prompt = (
            f"Redacta un email de cobro con los siguientes datos:\n"
            f"- Freelancer: {freelancer_name}\n"
            f"- Cliente: {client_name}\n"
            f"- Factura: {invoice_number}\n"
            f"- Monto: {amount} {currency}\n"
            f"- Días vencida: {days_overdue}\n"
            f"- Tono: {tone_instruction}\n\n"
            "Reglas:\n"
            "- Máximo 5 oraciones en el cuerpo\n"
            "- Incluye un call to action claro al final\n"
            "- NO sonar amenazante ni desesperado\n"
            "- Firma con el nombre del freelancer"
        )

        logger.info("Generating email for invoice %s, tone: %s", invoice_number, tone)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=400,
        )

        text = response.choices[0].message.content or ""
        subject, body = _parse_email_response(text, fallback_subject, fallback_body)
        logger.info("Email generated - subject: %s", subject)
        return subject, body

    except Exception as e:
        logger.info("OpenAI error: %s — using fallback email", e)
        return fallback_subject, fallback_body


def _parse_email_response(
    text: str, fallback_subject: str, fallback_body: str
) -> tuple[str, str]:
    """Extract subject and body from the model's response."""
    lines = text.strip().splitlines()
    subject: Optional[str] = None
    body_lines: list[str] = []

    for i, line in enumerate(lines):
        if line.startswith("Subject:") and subject is None:
            subject = line.removeprefix("Subject:").strip()
        elif subject is not None:
            body_lines.extend(lines[i:])
            break

    body = "\n".join(body_lines).strip()

    if not subject:
        subject = fallback_subject
    if not body:
        body = fallback_body

    return subject, body


def already_sent(invoice_id: str, reminder_day: int, db: Session) -> bool:
    """Return True if a reminder for this invoice+day was already sent."""
    return (
        db.query(EmailLog)
        .filter(
            EmailLog.invoice_id == invoice_id,
            EmailLog.reminder_day == reminder_day,
            EmailLog.status == "sent",
        )
        .first()
        is not None
    )


def process_pending_reminders(db: Session) -> None:
    """Main scheduler job: send due reminders and update overdue statuses.

    Fully idempotent — safe to run multiple times per day.
    """
    today = date.today()

    # Step 1 — mark pending invoices as overdue when past due date
    overdue_updated = (
        db.query(Invoice)
        .filter(Invoice.status == "pending", Invoice.due_date < today)
        .all()
    )
    for invoice in overdue_updated:
        invoice.status = "overdue"
        logger.info("marked overdue: invoice %s", invoice.id)
    if overdue_updated:
        db.commit()

    # Step 2 — find active invoices that need reminders
    active_invoices = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.user))
        .filter(
            Invoice.status.in_(["pending", "overdue"]),
            Invoice.reminder_config["active"].as_boolean() == True,  # noqa: E712
        )
        .all()
    )

    for invoice in active_invoices:
        try:
            # Automatic reminders are a Pro feature — skip Free plan users
            if invoice.user.plan == "free":
                logger.info("skipped (free plan): invoice %s", invoice.invoice_number)
                continue

            days_since_due = (today - invoice.due_date).days
            intervals: list[int] = invoice.reminder_config.get("intervals", [3, 7, 14])

            if days_since_due not in intervals:
                continue

            if already_sent(invoice.id, days_since_due, db):
                logger.info(
                    "skipped (already sent): invoice %s day %s",
                    invoice.invoice_number, days_since_due,
                )
                continue

            tone = get_tone_for_day(days_since_due)
            subject, body = generate_email_content(
                freelancer_name=invoice.user.full_name,
                client_name=invoice.client.name,
                amount=float(invoice.amount),
                currency=invoice.currency,
                invoice_number=invoice.invoice_number,
                days_overdue=days_since_due,
                tone=tone,
            )

            logger.info("Sending email to: %s", invoice.client.email)
            success = send_email(invoice.client.email, subject, body)

            log = EmailLog(
                invoice_id=invoice.id,
                recipient_email=invoice.client.email,
                reminder_day=days_since_due,
                tone=tone,
                status="sent" if success else "failed",
                sent_at=datetime.now(timezone.utc),
                subject=subject,
                body=body,
                error_message=None if success else "Email delivery failed",
            )
            db.add(log)
            db.commit()

            logger.info(
                "%s: invoice %s -> %s (day %s, tone=%s)",
                "sent" if success else "FAILED",
                invoice.invoice_number, invoice.client.email,
                days_since_due, tone,
            )

        except Exception as e:
            logger.error(
                "ERROR processing invoice %s: %s",
                invoice.invoice_number, e,
            )
            db.rollback()
