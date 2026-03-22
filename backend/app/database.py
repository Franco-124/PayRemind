import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.user import Base  # noqa: F401 — re-exported for convenience

DATABASE_URL = os.environ.get("DATABASE_URL", "")

engine = create_engine(DATABASE_URL) if DATABASE_URL else None  # type: ignore[arg-type]
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
