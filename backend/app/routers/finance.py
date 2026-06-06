from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.transaction import Budget, Transaction
from app.models.user import User
from app.schemas.transaction import (
    BudgetCreate,
    BudgetResponse,
    CategoryResponse,
    FinancialDashboard,
    TransactionCreate,
    TransactionResponse,
    TransactionScanResult,
)
from app.services import finance_service
from app.services.auth_service import get_current_user

router = APIRouter()

_current_year = datetime.utcnow().year
_current_month = datetime.utcnow().month

_ALLOWED_TYPES = {"image/jpeg", "image/png"}
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(
    type: Optional[str] = None,
    db: Session = Depends(get_db),
) -> list[CategoryResponse]:
    return finance_service.get_categories(db, type=type)


@router.post(
    "/transactions/scan",
    response_model=TransactionScanResult,
    status_code=status.HTTP_200_OK,
)
async def scan_transaction_image(
    file: UploadFile = File(...),
    category_id: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionScanResult:
    """Upload a receipt/invoice image and extract transaction fields for the given category."""
    from app.services.transaction_scan_service import scan_for_transaction

    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no soportado: {file.content_type}. Solo se aceptan JPG y PNG.",
        )

    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo está vacío.",
        )

    if len(image_bytes) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen es demasiado grande. Máximo 10 MB.",
        )

    result = scan_for_transaction(category_id, image_bytes, file.content_type, db)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return result


@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    type: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    category_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TransactionResponse]:
    return finance_service.get_transactions(
        current_user.id, db,
        type=type, month=month, year=year,
        category_id=category_id,
    )


@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionResponse:
    return finance_service.create_transaction(current_user.id, data, db)


@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    if txn.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    db.delete(txn)
    db.commit()
    return {"deleted": True}


@router.get("/budgets", response_model=list[BudgetResponse])
def list_budgets(
    year: int = _current_year,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BudgetResponse]:
    return (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id, Budget.year == year)
        .all()
    )


@router.post("/budgets", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BudgetResponse:
    budget = Budget(
        user_id=current_user.id,
        category_id=data.category_id,
        amount=data.amount,
        currency=data.currency,
        period_type=data.period_type,
        year=data.year,
        month=data.month,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    if budget.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    db.delete(budget)
    db.commit()
    return {"deleted": True}


@router.get("/dashboard", response_model=FinancialDashboard)
def get_dashboard(
    month: int = _current_month,
    year: int = _current_year,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FinancialDashboard:
    return finance_service.get_financial_dashboard(current_user.id, db, month, year)
