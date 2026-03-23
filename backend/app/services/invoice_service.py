from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import DataError
from sqlalchemy.orm import Session, joinedload

from app.models.client import Client
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceCreate, InvoiceStatusUpdate, InvoiceUpdate


def _commit(db: Session) -> None:
    """Commit and raise 422 on DB data errors instead of 500."""
    try:
        db.commit()
    except DataError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e.orig),
        )


def get_invoices(
    user_id: str, db: Session, invoice_status: Optional[str] = None
) -> list[Invoice]:
    """Return all invoices for user_id, optionally filtered by status."""
    query = (
        db.query(Invoice)
        .filter(Invoice.user_id == user_id)
        .options(joinedload(Invoice.client))
    )
    if invoice_status:
        query = query.filter(Invoice.status == invoice_status)
    return query.all()


def get_invoice(invoice_id: str, user_id: str, db: Session) -> Invoice:
    """Return a single invoice with client and email_logs loaded, enforcing ownership."""
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.email_logs))
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )
    if invoice.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this invoice",
        )
    return invoice


def create_invoice(user_id: str, data: InvoiceCreate, db: Session) -> Invoice:
    """Create a new invoice, verifying the client belongs to the user."""
    client = (
        db.query(Client)
        .filter(Client.id == data.client_id, Client.user_id == user_id)
        .first()
    )
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )

    reminder_config = (
        data.reminder_config.model_dump()
        if data.reminder_config
        else {"intervals": [3, 7, 14], "active": True}
    )

    invoice = Invoice(
        user_id=user_id,
        client_id=data.client_id,
        invoice_number=data.invoice_number,
        amount=data.amount,
        currency=data.currency,
        due_date=data.due_date,
        description=data.description,
        reminder_config=reminder_config,
    )
    db.add(invoice)
    _commit(db)
    db.refresh(invoice)
    # Load client relation for the response
    db.refresh(invoice, ["client"])
    return invoice


def update_invoice(
    invoice_id: str, user_id: str, data: InvoiceUpdate, db: Session
) -> Invoice:
    """Update only the provided fields of an invoice."""
    invoice = get_invoice(invoice_id, user_id, db)
    updates = data.model_dump(exclude_unset=True)
    if "reminder_config" in updates and updates["reminder_config"] is not None:
        updates["reminder_config"] = data.reminder_config.model_dump()
    for field, value in updates.items():
        setattr(invoice, field, value)
    _commit(db)
    db.refresh(invoice)
    db.refresh(invoice, ["client"])
    return invoice


def update_invoice_status(
    invoice_id: str, user_id: str, data: InvoiceStatusUpdate, db: Session
) -> Invoice:
    """Update only the status field of an invoice."""
    invoice = get_invoice(invoice_id, user_id, db)
    invoice.status = data.status
    _commit(db)
    db.refresh(invoice)
    db.refresh(invoice, ["client"])
    return invoice


def delete_invoice(invoice_id: str, user_id: str, db: Session) -> None:
    """Delete an invoice after verifying ownership."""
    invoice = get_invoice(invoice_id, user_id, db)
    db.delete(invoice)
    db.commit()
