import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.user import Base

DEFAULT_REMINDER_CONFIG = {"intervals": [3, 7, 14], "active": True}


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("pending", "overdue", "paid", "cancelled", name="invoice_status"),
        nullable=False,
        default="pending",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_config: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=lambda: DEFAULT_REMINDER_CONFIG.copy()
    )
    email_config_override: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="invoices")  # noqa: F821
    client: Mapped["Client"] = relationship(  # noqa: F821
        "Client", back_populates="invoices"
    )
    email_logs: Mapped[list["EmailLog"]] = relationship(  # noqa: F821
        "EmailLog", back_populates="invoice", cascade="all, delete-orphan"
    )
