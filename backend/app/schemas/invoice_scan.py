from typing import Optional

from pydantic import BaseModel


class InvoiceScanResult(BaseModel):
    """
    Datos extraídos de la imagen de la factura.
    Todos los campos son opcionales porque el modelo puede no encontrar alguno.
    confidence indica qué tan seguro está el modelo de la extracción (0.0 a 1.0).
    """
    invoice_number: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    due_date: Optional[str] = None       # formato YYYY-MM-DD
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    description: Optional[str] = None
    confidence: float = 0.0
    raw_text: Optional[str] = None       # texto completo extraído
    warnings: list[str] = []             # campos no encontrados
