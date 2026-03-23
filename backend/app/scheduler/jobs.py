from app.database import SessionLocal
from app.services import reminder_service


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
