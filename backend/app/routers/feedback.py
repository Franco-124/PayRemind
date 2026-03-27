from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse, FeedbackStatusUpdate
from app.services import feedback_service
from app.services.auth_service import get_current_user

router = APIRouter()


def _require_admin(current_user: User) -> None:
    """Raise 403 if the user is not the configured admin."""
    if current_user.email != settings.admin_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    """Submit feedback. Available to all authenticated users."""
    return feedback_service.create_feedback(current_user.id, data, db)


@router.get("/admin", response_model=list[FeedbackResponse])
def list_feedback_admin(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FeedbackResponse]:
    """List all feedback entries. Admin only."""
    _require_admin(current_user)
    return feedback_service.get_all_feedback(db, status)


@router.patch("/admin/{feedback_id}", response_model=FeedbackResponse)
def update_feedback_admin(
    feedback_id: str,
    data: FeedbackStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    """Update feedback status and admin notes. Admin only."""
    _require_admin(current_user)
    return feedback_service.update_feedback_status(feedback_id, data, db)
