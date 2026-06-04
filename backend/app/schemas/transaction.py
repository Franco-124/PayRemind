from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool


class TransactionCreate(BaseModel):
    category_id: str
    type: str
    amount: Decimal
    currency: str = "USD"
    description: Optional[str] = None
    date: date


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    amount: Decimal
    currency: str
    description: Optional[str] = None
    date: date
    is_automatic: bool
    created_at: datetime
    invoice_id: Optional[str] = None
    category: CategoryResponse


class BudgetCreate(BaseModel):
    category_id: Optional[str] = None
    amount: Decimal
    currency: str = "USD"
    period_type: str
    year: int
    month: Optional[int] = None


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount: Decimal
    currency: str
    period_type: str
    year: int
    month: Optional[int] = None
    category: Optional[CategoryResponse] = None


class FinancialSummary(BaseModel):
    total_income: float
    total_expenses: float
    balance: float
    currency: str
    period: str


class CategorySummary(BaseModel):
    category: CategoryResponse
    total: float
    currency: str
    percentage: float
    transactions_count: int


class BudgetStatus(BaseModel):
    budget: BudgetResponse
    spent: float
    remaining: float
    percentage_used: float
    is_exceeded: bool


class FinancialDashboard(BaseModel):
    summary: FinancialSummary
    income_by_category: list[CategorySummary]
    expenses_by_category: list[CategorySummary]
    budget_status: list[BudgetStatus]
    recent_transactions: list[TransactionResponse]
