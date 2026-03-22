from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class ClientCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    email: str
    company: Optional[str]
    notes: Optional[str]
    created_at: datetime
