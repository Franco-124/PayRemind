"""add finance module

Revision ID: d2e3f4a5b6c7
Revises: b9c0d1e2f3a4
Create Date: 2026-06-04 12:00:00.000000

"""
from typing import Sequence, Union
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM

from app.data.default_categories import EXPENSE_CATEGORIES, INCOME_CATEGORIES

revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, None] = 'b9c0d1e2f3a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Named enum type objects — create_type=False prevents auto-creation in op.create_table
_category_type = PG_ENUM('income', 'expense', name='category_type', create_type=False)
_transaction_type = PG_ENUM('income', 'expense', name='transaction_type', create_type=False)
_budget_period = PG_ENUM('monthly', 'annual', name='budget_period', create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    # checkfirst=True → only creates if the type does not already exist
    PG_ENUM('income', 'expense', name='category_type').create(bind, checkfirst=True)
    PG_ENUM('income', 'expense', name='transaction_type').create(bind, checkfirst=True)
    PG_ENUM('monthly', 'annual', name='budget_period').create(bind, checkfirst=True)

    op.create_table(
        'categories',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('type', _category_type, nullable=False),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'transactions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', sa.String(36), sa.ForeignKey('categories.id'), nullable=False),
        sa.Column('invoice_id', sa.String(36), sa.ForeignKey('invoices.id'), nullable=True),
        sa.Column('type', _transaction_type, nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('is_automatic', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'budgets',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', sa.String(36), sa.ForeignKey('categories.id'), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('period_type', _budget_period, nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_index('ix_transactions_user_id', 'transactions', ['user_id'])
    op.create_index('ix_transactions_date', 'transactions', ['date'])
    op.create_index('ix_budgets_user_id', 'budgets', ['user_id'])

    # Seed global categories (user_id = NULL)
    for cat in INCOME_CATEGORIES:
        op.execute(
            f"INSERT INTO categories (id, name, type, icon, color, is_default) "
            f"VALUES ('{uuid.uuid4()}', '{cat['name']}', 'income', "
            f"'{cat['icon']}', '{cat['color']}', true)"
        )

    for cat in EXPENSE_CATEGORIES:
        op.execute(
            f"INSERT INTO categories (id, name, type, icon, color, is_default) "
            f"VALUES ('{uuid.uuid4()}', '{cat['name']}', 'expense', "
            f"'{cat['icon']}', '{cat['color']}', true)"
        )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index('ix_budgets_user_id', 'budgets')
    op.drop_index('ix_transactions_date', 'transactions')
    op.drop_index('ix_transactions_user_id', 'transactions')
    op.drop_table('budgets')
    op.drop_table('transactions')
    op.drop_table('categories')

    PG_ENUM(name='budget_period').drop(bind, checkfirst=True)
    PG_ENUM(name='transaction_type').drop(bind, checkfirst=True)
    PG_ENUM(name='category_type').drop(bind, checkfirst=True)
