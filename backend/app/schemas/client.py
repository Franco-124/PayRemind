from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

VALID_LANGUAGES = {"es", "en"}
VALID_TONES = {"formal", "semi-formal", "casual"}
VALID_TREATMENTS = {"tu", "usted", "nombre"}


class ClientCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    notes: Optional[str] = None

    # Email configuration
    email_language: str = "es"
    email_tone: str = "semi-formal"
    email_treatment: str = "nombre"
    sender_name: Optional[str] = None
    email_instructions: Optional[str] = None

    @field_validator("email_language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if v not in VALID_LANGUAGES:
            raise ValueError("Language must be 'es' or 'en'")
        return v

    @field_validator("email_tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        if v not in VALID_TONES:
            raise ValueError("Tone must be 'formal', 'semi-formal', or 'casual'")
        return v

    @field_validator("email_treatment")
    @classmethod
    def validate_treatment(cls, v: str) -> str:
        if v not in VALID_TREATMENTS:
            raise ValueError("Treatment must be 'tu', 'usted', or 'nombre'")
        return v


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    notes: Optional[str] = None

    # Email configuration
    email_language: Optional[str] = None
    email_tone: Optional[str] = None
    email_treatment: Optional[str] = None
    sender_name: Optional[str] = None
    email_instructions: Optional[str] = None

    @field_validator("email_language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_LANGUAGES:
            raise ValueError("Language must be 'es' or 'en'")
        return v

    @field_validator("email_tone")
    @classmethod
    def validate_tone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_TONES:
            raise ValueError("Tone must be 'formal', 'semi-formal', or 'casual'")
        return v

    @field_validator("email_treatment")
    @classmethod
    def validate_treatment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_TREATMENTS:
            raise ValueError("Treatment must be 'tu', 'usted', or 'nombre'")
        return v


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    email: str
    company: Optional[str]
    notes: Optional[str]
    email_language: str
    email_tone: str
    email_treatment: str
    sender_name: Optional[str]
    email_instructions: Optional[str]
    created_at: datetime
