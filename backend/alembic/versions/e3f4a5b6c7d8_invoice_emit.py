"""invoice emit — add invoice_counter to users, add items/issued_date/sent_at to invoices

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-06-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "e3f4a5b6c7d8"
down_revision = "d2e3f4a5b6c7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("invoice_counter", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "invoices",
        sa.Column("items", JSONB(), nullable=True),
    )
    op.add_column(
        "invoices",
        sa.Column("issued_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "invoices",
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("invoices", "sent_at")
    op.drop_column("invoices", "issued_date")
    op.drop_column("invoices", "items")
    op.drop_column("users", "invoice_counter")
