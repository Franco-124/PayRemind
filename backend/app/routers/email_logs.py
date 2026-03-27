from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.email_log import EmailLog
from app.models.invoice import Invoice
from app.models.user import User
from app.services.auth_service import get_current_user
from datetime import datetime

router = APIRouter()


class InvoiceSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    invoice_number: str
    amount: float
    currency: str


class ClientSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    email: str


class EmailLogDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    subject: Optional[str] = None
    body: Optional[str] = None
    tone: str
    status: str
    sent_at: datetime
    reminder_day: int
    error_message: Optional[str] = None
    invoice: InvoiceSummary
    client: ClientSummary


@router.get("/", response_model=list[EmailLogDetailResponse])
def list_email_logs(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EmailLogDetailResponse]:
    query = (
        db.query(EmailLog)
        .join(Invoice, EmailLog.invoice_id == Invoice.id)
        .options(
            joinedload(EmailLog.invoice).joinedload(Invoice.client)
        )
        .filter(Invoice.user_id == current_user.id)
    )

    if status in ("sent", "failed"):
        query = query.filter(EmailLog.status == status)

    logs = query.order_by(EmailLog.sent_at.desc()).all()

    result = []
    for log in logs:
        result.append(
            EmailLogDetailResponse(
                id=log.id,
                subject=log.subject,
                body=log.body,
                tone=log.tone,
                status=log.status,
                sent_at=log.sent_at,
                reminder_day=log.reminder_day,
                error_message=log.error_message,
                invoice=InvoiceSummary(
                    invoice_number=log.invoice.invoice_number,
                    amount=float(log.invoice.amount),
                    currency=log.invoice.currency,
                ),
                client=ClientSummary(
                    name=log.invoice.client.name,
                    email=log.invoice.client.email,
                ),
            )
        )
    return result
