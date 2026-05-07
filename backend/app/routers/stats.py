from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

router = APIRouter()


@router.get("/trial-slots")
def trial_slots(db: Session = Depends(get_db)) -> dict:
    """Return trial slot availability. No authentication required."""
    used = db.query(User).filter(User.is_trial == True).count()  # noqa: E712
    total = settings.trial_slots_total
    return {"total": total, "used": used, "available": max(0, total - used)}
