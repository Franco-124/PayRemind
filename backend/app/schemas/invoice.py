from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.client import ClientResponse


class ReminderConfig(BaseModel):
    intervals: list[int] = [3, 7, 14]
    active: bool = True


class InvoiceCreate(BaseModel):
    client_id: str
    invoice_number: str
    amount: Decimal
    currency: str = "USD"
    due_date: date
    description: Optional[str] = None
    reminder_config: Optional[ReminderConfig] = None


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    due_date: Optional[date] = None
    description: Optional[str] = None
    reminder_config: Optional[ReminderConfig] = None


class InvoiceStatusUpdate(BaseModel):
    status: str  # 'pending' | 'overdue' | 'paid' | 'cancelled'


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    client_id: str
    invoice_number: str
    amount: Decimal
    currency: str
    due_date: date
    status: str
    description: Optional[str]
    reminder_config: dict
    created_at: datetime
    client: ClientResponse
