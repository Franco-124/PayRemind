from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EmailLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    recipient_email: str
    reminder_day: int
    tone: str
    status: str
    sent_at: datetime
    error_message: Optional[str]
