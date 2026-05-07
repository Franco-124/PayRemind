import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# ── Password spec (mirrors app/lib/password-rules.ts) ──────────────────────
_PASSWORD_MIN_LENGTH = 8
_PASSWORD_RULES = {
    "uppercase": re.compile(r"[A-Z]"),
    "lowercase": re.compile(r"[a-z]"),
    "digit":     re.compile(r"[0-9]"),
    "special":   re.compile(r"[!@#$%^&*()\-_=+\[\]{}|;:'\",.<>?/`~\\]"),
}


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=_PASSWORD_MIN_LENGTH)
    full_name: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors: list[str] = []
        if not _PASSWORD_RULES["uppercase"].search(v):
            errors.append("at least one uppercase letter (A-Z)")
        if not _PASSWORD_RULES["lowercase"].search(v):
            errors.append("at least one lowercase letter (a-z)")
        if not _PASSWORD_RULES["digit"].search(v):
            errors.append("at least one number (0-9)")
        if not _PASSWORD_RULES["special"].search(v):
            errors.append("at least one special character (!@#$…)")
        if errors:
            raise ValueError("Password must contain: " + ", ".join(errors))
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    plan: str
    created_at: datetime
    is_trial: bool = False
    trial_ends_at: datetime | None = None


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: str | None = None
