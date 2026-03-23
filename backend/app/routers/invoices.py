from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    InvoiceStatusUpdate,
    InvoiceUpdate,
)
from app.services.auth_service import get_current_user
from app.services import invoice_service

router = APIRouter()


@router.get("/", response_model=list[InvoiceResponse])
def list_invoices(
    invoice_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InvoiceResponse]:
    return invoice_service.get_invoices(current_user.id, db, invoice_status)


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    return invoice_service.create_invoice(current_user.id, data, db)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    return invoice_service.get_invoice(invoice_id, current_user.id, db)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    return invoice_service.update_invoice(invoice_id, current_user.id, data, db)


@router.patch("/{invoice_id}/status", response_model=InvoiceResponse)
def update_invoice_status(
    invoice_id: str,
    data: InvoiceStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    return invoice_service.update_invoice_status(
        invoice_id, current_user.id, data, db
    )


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    invoice_service.delete_invoice(invoice_id, current_user.id, db)


@router.patch("/{invoice_id}/reminders/toggle", response_model=InvoiceResponse)
def toggle_reminders(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    return invoice_service.toggle_reminders(invoice_id, current_user.id, db)


@router.post(
    "/{invoice_id}/test-reminder",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Send reminder immediately",
)
def test_reminder(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Send a reminder email for this invoice immediately, bypassing interval checks."""
    from datetime import date
    from sqlalchemy.orm import joinedload
    from app.models.invoice import Invoice
    from app.services.reminder_service import get_tone_for_day, generate_email_content
    from app.services.email_service import send_email
    from app.models.email_log import EmailLog
    from datetime import datetime, timezone

    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.user))
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not invoice or invoice.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Invoice not found")

    today = date.today()
    days_since_due = max((today - invoice.due_date).days, 0)
    tone = get_tone_for_day(days_since_due)

    subject, body = generate_email_content(
        freelancer_name=current_user.full_name,
        client_name=invoice.client.name,
        amount=float(invoice.amount),
        currency=invoice.currency,
        invoice_number=invoice.invoice_number,
        days_overdue=days_since_due,
        tone=tone,
    )

    success = send_email(invoice.client.email, subject, body)

    log = EmailLog(
        invoice_id=invoice.id,
        recipient_email=invoice.client.email,
        reminder_day=days_since_due,
        tone=tone,
        status="sent" if success else "failed",
        sent_at=datetime.now(timezone.utc),
        error_message=None if success else "Email delivery failed",
    )
    db.add(log)
    db.commit()

    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail="Email delivery failed")

    return {"detail": "Reminder sent", "to": invoice.client.email, "tone": tone}
