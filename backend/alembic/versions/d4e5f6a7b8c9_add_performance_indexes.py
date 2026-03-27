"""add performance indexes

Revision ID: d4e5f6a7b8c9
Revises: c3f1a2b4d5e6
Create Date: 2026-03-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3f1a2b4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # invoices.user_id — used on every authenticated invoice list query
    op.create_index('ix_invoices_user_id', 'invoices', ['user_id'])
    # invoices.status — used by scheduler to filter pending/overdue
    op.create_index('ix_invoices_status', 'invoices', ['status'])
    # email_logs.invoice_id — used for per-invoice email history lookups
    op.create_index('ix_email_logs_invoice_id', 'email_logs', ['invoice_id'])


def downgrade() -> None:
    op.drop_index('ix_email_logs_invoice_id', table_name='email_logs')
    op.drop_index('ix_invoices_status', table_name='invoices')
    op.drop_index('ix_invoices_user_id', table_name='invoices')
