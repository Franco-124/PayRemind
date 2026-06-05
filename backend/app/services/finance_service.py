import logging
from calendar import monthrange
from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.transaction import Budget, Category, Transaction
from app.schemas.transaction import (
    BudgetCreate,
    BudgetResponse,
    BudgetStatus,
    CategoryResponse,
    CategorySummary,
    FinancialDashboard,
    FinancialSummary,
    TransactionCreate,
    TransactionFromScanRequest,
    TransactionResponse,
)

logger = logging.getLogger(__name__)


def create_transaction_from_scan(
    user_id: str,
    data: TransactionFromScanRequest,
    db: Session,
) -> Transaction:
    """Create a finance transaction from an invoice scan result.

    Field resolution order: explicit override → scan_result field → sensible default.
    Raises 422 if amount cannot be resolved from either source.
    Raises 404 if category_id is not found.
    """
    from fastapi import HTTPException, status

    resolved_amount = data.amount or data.scan_result.amount
    if resolved_amount is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="amount is required — not found in scan result or request body.",
        )

    resolved_currency = data.currency or data.scan_result.currency or "USD"
    resolved_date = data.date or (
        date.fromisoformat(data.scan_result.due_date)
        if data.scan_result.due_date
        else date.today()
    )
    resolved_description = (
        data.description
        or data.scan_result.description
        or "Transacción"
    )

    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    txn_data = TransactionCreate(
        category_id=data.category_id,
        type=data.type,
        amount=Decimal(str(resolved_amount)),
        currency=resolved_currency,
        description=resolved_description,
        date=resolved_date,
    )
    return create_transaction(user_id, txn_data, db, invoice_id=None, is_automatic=False)


def get_categories(
    db: Session, type: Optional[str] = None
) -> list[Category]:
    """Return all global categories (user_id IS NULL), optionally filtered by type."""
    query = db.query(Category).filter(Category.user_id.is_(None))
    if type:
        query = query.filter(Category.type == type)
    return query.order_by(Category.name).all()


def create_transaction(
    user_id: str,
    data: TransactionCreate,
    db: Session,
    invoice_id: Optional[str] = None,
    is_automatic: bool = False,
) -> Transaction:
    """Create and persist a transaction."""
    txn = Transaction(
        user_id=user_id,
        category_id=data.category_id,
        invoice_id=invoice_id,
        type=data.type,
        amount=data.amount,
        currency=data.currency,
        description=data.description,
        date=data.date,
        is_automatic=is_automatic,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    db.refresh(txn, ["category"])
    logger.info(
        "Transaction created: %s %.2f %s user=%s",
        data.type, data.amount, data.currency, user_id,
    )
    return txn


def register_invoice_payment(
    user_id: str,
    invoice_id: str,
    amount: float,
    currency: str,
    db: Session,
) -> Optional[Transaction]:
    """Auto-register an income transaction when an invoice is marked as paid."""
    cat = (
        db.query(Category)
        .filter(
            Category.name == "Pago de factura",
            Category.type == "income",
            Category.user_id.is_(None),
        )
        .first()
    )
    if not cat:
        logger.error("Category 'Pago de factura' not found — skipping auto-registration")
        return None

    data = TransactionCreate(
        category_id=cat.id,
        type="income",
        amount=Decimal(str(amount)),
        currency=currency,
        description="Pago automático de factura",
        date=date.today(),
    )
    return create_transaction(user_id, data, db, invoice_id=invoice_id, is_automatic=True)


def get_transactions(
    user_id: str,
    db: Session,
    type: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    category_id: Optional[str] = None,
    limit: int = 50,
) -> list[Transaction]:
    """Return transactions for a user with optional filters, ordered by date DESC."""
    query = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .options(joinedload(Transaction.category))
    )
    if type:
        query = query.filter(Transaction.type == type)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if year and month:
        _, last_day = monthrange(year, month)
        query = query.filter(
            Transaction.date >= date(year, month, 1),
            Transaction.date <= date(year, month, last_day),
        )
    elif year:
        query = query.filter(
            Transaction.date >= date(year, 1, 1),
            Transaction.date <= date(year, 12, 31),
        )
    return query.order_by(Transaction.date.desc()).limit(limit).all()


def _group_by_category(
    transactions: list[Transaction], total: float
) -> list[CategorySummary]:
    """Group transactions by category and compute totals and percentages."""
    grouped: dict[str, list[Transaction]] = defaultdict(list)
    for txn in transactions:
        grouped[txn.category_id].append(txn)

    result = []
    for txns in grouped.values():
        cat_total = float(sum(t.amount for t in txns))
        percentage = round(cat_total / total * 100, 2) if total > 0 else 0.0
        result.append(
            CategorySummary(
                category=CategoryResponse.model_validate(txns[0].category),
                total=cat_total,
                currency=txns[0].currency,
                percentage=percentage,
                transactions_count=len(txns),
            )
        )
    result.sort(key=lambda x: x.total, reverse=True)
    return result


def get_financial_dashboard(
    user_id: str, db: Session, month: int, year: int
) -> FinancialDashboard:
    """Build the complete financial dashboard for a given month/year."""
    _, last_day = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last_day)

    period_txns = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date >= start,
            Transaction.date <= end,
        )
        .options(joinedload(Transaction.category))
        .all()
    )

    income_txns = [t for t in period_txns if t.type == "income"]
    expense_txns = [t for t in period_txns if t.type == "expense"]

    total_income = float(sum(t.amount for t in income_txns))
    total_expenses = float(sum(t.amount for t in expense_txns))

    summary = FinancialSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        balance=round(total_income - total_expenses, 2),
        currency="USD",
        period=f"{year}-{month:02d}",
    )

    income_by_cat = _group_by_category(income_txns, total_income)
    expenses_by_cat = _group_by_category(expense_txns, total_expenses)

    # Budget status
    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == user_id, Budget.year == year)
        .options(joinedload(Budget.category))
        .all()
    )

    budget_statuses: list[BudgetStatus] = []
    for budget in budgets:
        if budget.period_type == "monthly" and budget.month != month:
            continue

        spent_query = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= start,
            Transaction.date <= end,
        )
        if budget.category_id:
            spent_query = spent_query.filter(
                Transaction.category_id == budget.category_id
            )

        spent = float(sum(t.amount for t in spent_query.all()))
        budget_amount = float(budget.amount)
        pct = round(spent / budget_amount * 100, 2) if budget_amount > 0 else 0.0

        budget_statuses.append(
            BudgetStatus(
                budget=BudgetResponse.model_validate(budget),
                spent=spent,
                remaining=round(budget_amount - spent, 2),
                percentage_used=pct,
                is_exceeded=spent > budget_amount,
            )
        )

    recent = get_transactions(user_id, db, month=month, year=year, limit=10)
    recent_response = [TransactionResponse.model_validate(t) for t in recent]

    return FinancialDashboard(
        summary=summary,
        income_by_category=income_by_cat,
        expenses_by_category=expenses_by_cat,
        budget_status=budget_statuses,
        recent_transactions=recent_response,
    )
