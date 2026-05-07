import logging
from datetime import datetime, timezone

from app.database import SessionLocal
from app.services import reminder_service

logger = logging.getLogger(__name__)


def check_and_send_reminders() -> None:
    """APScheduler job: process all pending reminders.

    Opens its own DB session since the scheduler runs outside
    a request context (no FastAPI dependency injection).
    """
    db = SessionLocal()
    try:
        reminder_service.process_pending_reminders(db)
    finally:
        db.close()


def check_expired_trials() -> None:
    """Revoke Pro plan for users whose trial period has expired."""
    from app.models.user import User

    db = SessionLocal()
    try:
        expired = (
            db.query(User)
            .filter(
                User.is_trial == True,  # noqa: E712
                User.plan == "pro",
                User.trial_ends_at < datetime.now(timezone.utc),
            )
            .all()
        )

        for user in expired:
            user.plan = "free"
            logger.info("Trial expired for user: %s", user.email)

        db.commit()
        logger.info("Checked trials — %d expired", len(expired))
    finally:
        db.close()
