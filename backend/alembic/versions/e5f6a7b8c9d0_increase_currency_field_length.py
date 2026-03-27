"""increase currency field length

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-26 13:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'invoices',
        'currency',
        existing_type=sa.String(3),
        type_=sa.String(10),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'invoices',
        'currency',
        existing_type=sa.String(10),
        type_=sa.String(3),
        existing_nullable=False,
    )
