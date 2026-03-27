from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.user import UserResponse

VALID_CATEGORIES = {"bug", "feature", "improvement", "other"}
VALID_PRIORITIES = {"low", "medium", "high"}
VALID_STATUSES = {"pending", "reviewed", "in_progress", "done"}


class FeedbackCreate(BaseModel):
    category: str
    priority: str
    rating: int
    message: str

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Category must be one of {sorted(VALID_CATEGORIES)}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of {sorted(VALID_PRIORITIES)}")
        return v

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Message must be at least 10 characters")
        return v


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    priority: str
    rating: int
    message: str
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    user: UserResponse


class FeedbackStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of {sorted(VALID_STATUSES)}")
        return v
