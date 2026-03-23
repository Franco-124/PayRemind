from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.client import ClientResponse
from app.schemas.email_log import EmailLogResponse


class ReminderConfig(BaseModel):
    intervals: list[int] = [3, 7, 14]
    active: bool = True


VALID_STATUSES = {"pending", "overdue", "paid", "cancelled"}


class InvoiceCreate(BaseModel):
    client_id: str
    invoice_number: str
    amount: Decimal = Field(gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    due_date: date
    description: Optional[str] = None
    reminder_config: Optional[ReminderConfig] = None


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    amount: Optional[Decimal] = Field(default=None, gt=0)
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)
    due_date: Optional[date] = None
    description: Optional[str] = None
    reminder_config: Optional[ReminderConfig] = None


class InvoiceStatusUpdate(BaseModel):
    status: str  # 'pending' | 'overdue' | 'paid' | 'cancelled'

    def model_post_init(self, __context: object) -> None:
        if self.status not in VALID_STATUSES:
            from pydantic import ValidationError
            raise ValueError(
                f"status must be one of {sorted(VALID_STATUSES)}"
            )


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
    email_logs: list[EmailLogResponse] = []
