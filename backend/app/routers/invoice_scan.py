from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.invoice_scan import InvoiceScanResult
from app.services.auth_service import get_current_user
from app.services.invoice_scan_service import scan_invoice_image

router = APIRouter()

_ALLOWED_TYPES = {"image/jpeg", "image/png"}
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/scan", response_model=InvoiceScanResult)
async def scan_invoice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceScanResult:
    """Receive a JPG/PNG invoice image and extract its data using GPT-4o Vision.

    The client should confirm the returned data before creating the invoice —
    this endpoint only extracts, it does not persist anything.
    """
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

    return scan_invoice_image(image_bytes=image_bytes, content_type=file.content_type)
