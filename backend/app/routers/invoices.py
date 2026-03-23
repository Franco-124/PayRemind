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
from app.services import invoice_service, reminder_service

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
    summary="Test reminder (dev only)",
)
def test_reminder(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Trigger reminder processing immediately — for testing without the cron job."""
    invoice_service.get_invoice(invoice_id, current_user.id, db)  # verify ownership
    reminder_service.process_pending_reminders(db)
    return {"detail": "Reminder processing triggered"}
