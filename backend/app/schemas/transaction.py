from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool
    scan_fields: Optional[list] = None


class TransactionCreate(BaseModel):
    category_id: str
    type: str
    amount: Decimal
    currency: str = "USD"
    description: Optional[str] = None
    date: date
    extra_data: Optional[dict] = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    amount: Decimal
    currency: str
    description: Optional[str] = None
    date: date
    is_automatic: bool
    extra_data: Optional[dict] = None
    created_at: datetime
    invoice_id: Optional[str] = None
    category: CategoryResponse


class TransactionScanResult(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = None
    date: Optional[str] = None        # YYYY-MM-DD
    description: Optional[str] = None
    extra_data: dict = {}
    confidence: float = 0.0
    warnings: list[str] = []


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
