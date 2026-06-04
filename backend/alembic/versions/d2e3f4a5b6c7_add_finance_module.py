"""add finance module

Revision ID: d2e3f4a5b6c7
Revises: b9c0d1e2f3a4
Create Date: 2026-06-04 12:00:00.000000

"""
from typing import Sequence, Union
import uuid

import sqlalchemy as sa
from alembic import op

from app.data.default_categories import EXPENSE_CATEGORIES, INCOME_CATEGORIES

revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, None] = 'b9c0d1e2f3a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE IF NOT EXISTS category_type AS ENUM ('income', 'expense')")
    op.execute("CREATE TYPE IF NOT EXISTS transaction_type AS ENUM ('income', 'expense')")
    op.execute("CREATE TYPE IF NOT EXISTS budget_period AS ENUM ('monthly', 'annual')")

    op.create_table(
        'categories',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('type', sa.Enum('income', 'expense', name='category_type', create_type=False), nullable=False),
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
        sa.Column('type', sa.Enum('income', 'expense', name='transaction_type', create_type=False), nullable=False),
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
        sa.Column('period_type', sa.Enum('monthly', 'annual', name='budget_period', create_type=False), nullable=False),
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
    op.drop_index('ix_budgets_user_id', 'budgets')
    op.drop_index('ix_transactions_date', 'transactions')
    op.drop_index('ix_transactions_user_id', 'transactions')
    op.drop_table('budgets')
    op.drop_table('transactions')
    op.drop_table('categories')
    op.execute("DROP TYPE IF EXISTS budget_period")
    op.execute("DROP TYPE IF EXISTS transaction_type")
    op.execute("DROP TYPE IF EXISTS category_type")
