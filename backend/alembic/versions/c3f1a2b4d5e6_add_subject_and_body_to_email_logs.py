"""add subject and body to email_logs

Revision ID: c3f1a2b4d5e6
Revises: ba8d9182595b
Create Date: 2026-03-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3f1a2b4d5e6'
down_revision: Union[str, None] = 'ba8d9182595b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('email_logs', sa.Column('subject', sa.String(500), nullable=True))
    op.add_column('email_logs', sa.Column('body', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('email_logs', 'body')
    op.drop_column('email_logs', 'subject')
