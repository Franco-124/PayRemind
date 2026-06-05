import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import DataError
from sqlalchemy.orm import Session, joinedload

logger = logging.getLogger(__name__)

from app.models.client import Client
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceEmitRequest, InvoiceStatusUpdate, InvoiceUpdate

FREE_PLAN_INVOICE_LIMIT = 3


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
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.plan == "free":
        active_count = (
            db.query(Invoice)
            .filter(
                Invoice.user_id == user_id,
                Invoice.status.in_(["pending", "overdue"]),
            )
            .count()
        )
        if active_count >= FREE_PLAN_INVOICE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="free_plan_limit_reached",
            )

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

    invoice_number = data.invoice_number or _next_invoice_number(user_id, db)

    invoice = Invoice(
        user_id=user_id,
        client_id=data.client_id,
        invoice_number=invoice_number,
        amount=data.amount,
        currency=data.currency,
        due_date=data.due_date,
        description=data.description,
        reminder_config=reminder_config,
        email_config_override=data.email_config_override,
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

    if data.status == "paid":
        from app.services.finance_service import register_invoice_payment
        try:
            register_invoice_payment(
                user_id=user_id,
                invoice_id=invoice_id,
                amount=float(invoice.amount),
                currency=invoice.currency,
                db=db,
            )
            logger.info("Auto-registered income for paid invoice %s", invoice_id)
        except Exception as e:
            logger.error("Failed to register payment for invoice %s: %s", invoice_id, e)

    return invoice


def toggle_reminders(invoice_id: str, user_id: str, db: Session) -> Invoice:
    """Toggle reminder_config.active for an invoice."""
    invoice = get_invoice(invoice_id, user_id, db)
    config = dict(invoice.reminder_config)
    config["active"] = not config.get("active", True)
    invoice.reminder_config = config
    _commit(db)
    db.refresh(invoice)
    db.refresh(invoice, ["client"])
    return invoice


def _next_invoice_number(user_id: str, db: Session) -> str:
    """Atomically increment the user's invoice_counter and return the formatted number."""
    result = db.execute(
        text(
            "UPDATE users SET invoice_counter = invoice_counter + 1 "
            "WHERE id = :uid RETURNING invoice_counter"
        ),
        {"uid": user_id},
    )
    counter = result.scalar()
    db.commit()
    return f"INV-{counter:04d}"


def emit_invoice(user_id: str, data: InvoiceEmitRequest, db: Session) -> tuple[Invoice, bool]:
    """Create a new invoice from line items, generate its PDF and email it to the client.

    Returns:
        (invoice, email_sent) — invoice is always persisted; email_sent may be False.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.plan == "free":
        active_count = (
            db.query(Invoice)
            .filter(
                Invoice.user_id == user_id,
                Invoice.status.in_(["pending", "overdue"]),
            )
            .count()
        )
        if active_count >= FREE_PLAN_INVOICE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="free_plan_limit_reached",
            )

    client = (
        db.query(Client)
        .filter(Client.id == data.client_id, Client.user_id == user_id)
        .first()
    )
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    issued = data.issued_date or date.today()
    items_with_totals = [
        {
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": round(item.quantity * item.unit_price, 2),
        }
        for item in data.items
    ]
    total = round(sum(i["total"] for i in items_with_totals), 2)

    invoice_number = _next_invoice_number(user_id, db)

    invoice = Invoice(
        user_id=user_id,
        client_id=data.client_id,
        invoice_number=invoice_number,
        amount=Decimal(str(total)),
        currency=data.currency,
        due_date=data.due_date,
        description=data.notes,
        reminder_config={"intervals": [3, 7, 14], "active": True},
        items=items_with_totals,
        issued_date=issued,
        sent_at=None,
    )
    db.add(invoice)
    _commit(db)
    db.refresh(invoice)
    db.refresh(invoice, ["client", "user"])

    from app.services.pdf_service import generate_invoice_pdf
    from app.services.email_service import send_invoice_email

    pdf_bytes = generate_invoice_pdf(
        invoice_number=invoice_number,
        freelancer_name=user.full_name,
        freelancer_email=user.email,
        client_name=client.name,
        client_email=client.email,
        client_company=client.company,
        items=items_with_totals,
        total=total,
        currency=data.currency,
        issued_date=issued,
        due_date=data.due_date,
        notes=data.notes,
    )

    email_sent = send_invoice_email(
        to=client.email,
        client_name=client.name,
        freelancer_name=user.full_name,
        invoice_number=invoice_number,
        total=total,
        currency=data.currency,
        due_date=data.due_date.strftime("%d/%m/%Y"),
        pdf_bytes=pdf_bytes,
    )

    if email_sent:
        invoice.sent_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(invoice)

    return invoice, email_sent


def get_invoice_pdf_bytes(invoice_id: str, user_id: str, db: Session) -> tuple[bytes, str]:
    """Regenerate the PDF for an emitted invoice on-demand.

    Returns:
        (pdf_bytes, invoice_number)
    Raises:
        404 if invoice not found, 403 if not owner, 400 if invoice has no items.
    """
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.user))
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    if invoice.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if not invoice.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta factura no tiene ítems — fue creada manualmente y no tiene PDF.",
        )

    from app.services.pdf_service import generate_invoice_pdf
    user = db.query(User).filter(User.id == user_id).first()

    pdf_bytes = generate_invoice_pdf(
        invoice_number=invoice.invoice_number,
        freelancer_name=user.full_name,
        freelancer_email=user.email,
        client_name=invoice.client.name,
        client_email=invoice.client.email,
        client_company=invoice.client.company,
        items=invoice.items,
        total=float(invoice.amount),
        currency=invoice.currency,
        issued_date=invoice.issued_date or invoice.created_at.date(),
        due_date=invoice.due_date,
        notes=invoice.description,
    )
    return pdf_bytes, invoice.invoice_number


def delete_invoice(invoice_id: str, user_id: str, db: Session) -> None:
    """Delete an invoice after verifying ownership."""
    invoice = get_invoice(invoice_id, user_id, db)
    db.delete(invoice)
    db.commit()
