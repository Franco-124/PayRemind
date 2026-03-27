"""add email config to clients and invoices

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-03-27 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # clients — email configuration fields
    op.add_column('clients', sa.Column('email_language', sa.String(2), nullable=False, server_default='es'))
    op.add_column('clients', sa.Column('email_tone', sa.String(20), nullable=False, server_default='semi-formal'))
    op.add_column('clients', sa.Column('email_treatment', sa.String(20), nullable=False, server_default='nombre'))
    op.add_column('clients', sa.Column('sender_name', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('email_instructions', sa.Text(), nullable=True))

    # invoices — per-invoice email config override
    op.add_column('invoices', sa.Column('email_config_override', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('invoices', 'email_config_override')
    op.drop_column('clients', 'email_instructions')
    op.drop_column('clients', 'sender_name')
    op.drop_column('clients', 'email_treatment')
    op.drop_column('clients', 'email_tone')
    op.drop_column('clients', 'email_language')
