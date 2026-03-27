import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackStatusUpdate

logger = logging.getLogger(__name__)


def create_feedback(user_id: str, data: FeedbackCreate, db: Session) -> Feedback:
    """Create a new feedback entry for the given user."""
    feedback = Feedback(
        user_id=user_id,
        category=data.category,
        priority=data.priority,
        rating=data.rating,
        message=data.message,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    db.refresh(feedback, ["user"])
    logger.info("Feedback created: %s by user %s", feedback.id, user_id)
    return feedback


def get_all_feedback(db: Session, status: Optional[str] = None) -> list[Feedback]:
    """Return all feedback entries, optionally filtered by status."""
    query = (
        db.query(Feedback)
        .options(joinedload(Feedback.user))
        .order_by(Feedback.created_at.desc())
    )
    if status:
        query = query.filter(Feedback.status == status)
    return query.all()


def update_feedback_status(
    feedback_id: str, data: FeedbackStatusUpdate, db: Session
) -> Feedback:
    """Update status and optional admin notes for a feedback entry."""
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.user))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    feedback.status = data.status
    feedback.admin_notes = data.admin_notes
    db.commit()
    db.refresh(feedback)
    logger.info("Feedback %s updated to status: %s", feedback_id, data.status)
    return feedback
