import base64
import json
import logging
import re
from typing import Optional

from openai import OpenAI
from sqlalchemy.orm import Session

from app.config import settings
from app.models.transaction import Category
from app.schemas.transaction import TransactionScanResult

logger = logging.getLogger(__name__)

_BASE_FIELDS = ["amount", "currency", "date", "description"]

_SYSTEM_PROMPT = """
Sos un asistente especializado en extraer datos de comprobantes, recibos y facturas.
Tu única tarea es leer la imagen y extraer los campos solicitados en formato JSON.

REGLAS ESTRICTAS:
1. Respondé ÚNICAMENTE con JSON válido — sin texto, sin explicaciones fuera del JSON
2. Si un campo no está visible en la imagen → null
3. amount: solo el número, sin símbolos de moneda (ej: 45.50)
4. currency: código ISO (USD, COP, EUR, ARS, etc.)
5. date: formato YYYY-MM-DD (convertí DD/MM/YYYY o similares)
6. confidence: 0.0 a 1.0 según qué tan claros están los datos
7. warnings: lista los campos que no pudiste encontrar
"""


def _build_user_prompt(category_name: str, category_type: str, extra_fields: list[str]) -> str:
    all_fields = _BASE_FIELDS + extra_fields
    field_descriptions = {
        "amount": "monto total (número sin símbolo)",
        "currency": "moneda (código ISO)",
        "date": "fecha del comprobante (YYYY-MM-DD)",
        "description": "descripción breve del concepto",
        "client_name": "nombre del cliente o pagador",
        "invoice_number": "número de factura o comprobante",
        "project_name": "nombre del proyecto",
        "product_name": "nombre del producto",
        "instrument_name": "nombre del instrumento de inversión",
        "vendor_name": "nombre del negocio o proveedor",
        "provider_name": "nombre del proveedor del servicio",
        "destination": "destino o ruta",
        "service_name": "nombre del servicio o suscripción",
        "tool_name": "nombre de la herramienta o software",
        "billing_period": "período de facturación (ej: mensual, anual, junio 2026)",
        "institution_name": "nombre de la institución o plataforma educativa",
        "course_name": "nombre del curso o programa",
        "concept": "concepto del gasto (ej: alquiler, expensas)",
        "venue_name": "nombre del lugar o plataforma de entretenimiento",
    }

    fields_list = "\n".join(
        f'- "{f}": {field_descriptions.get(f, f)}'
        for f in all_fields
    )

    extra_json = "".join(f'\n  "{f}": ...,' for f in extra_fields)

    return f"""Categoría del comprobante: {category_name} ({category_type})

Extraé exactamente estos campos:
{fields_list}

Respondé con este JSON:
{{
  "amount": ...,
  "currency": ...,
  "date": ...,
  "description": ...,{extra_json}
  "confidence": ...,
  "warnings": [...]
}}"""


def scan_for_transaction(
    category_id: str,
    image_bytes: bytes,
    content_type: str,
    db: Session,
) -> Optional[TransactionScanResult]:
    """Extract transaction fields from a receipt/invoice image using GPT-4o Vision.

    The prompt is tailored to the category's scan_fields so GPT focuses on
    what's relevant for that type of expense/income.

    Returns TransactionScanResult. Never raises on model/parse failure —
    returns a zero-confidence result instead.
    Returns None only if the category is not found.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None

    extra_fields: list[str] = category.scan_fields or []
    user_prompt = _build_user_prompt(category.name, category.type, extra_fields)

    client = OpenAI(api_key=settings.openai_api_key)

    try:
        image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        logger.info(
            "Scanning receipt for category '%s' (%d bytes)", category.name, len(image_bytes)
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=800,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{image_b64}",
                                "detail": "high",
                            },
                        },
                        {"type": "text", "text": user_prompt},
                    ],
                },
            ],
        )

        raw = response.choices[0].message.content or ""
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw.strip())
        data = json.loads(cleaned)

        # Separate base fields from extra_data
        base = {k: data.get(k) for k in _BASE_FIELDS}
        extra_data = {k: data[k] for k in extra_fields if k in data and data[k] is not None}

        result = TransactionScanResult(
            amount=base.get("amount"),
            currency=base.get("currency"),
            date=base.get("date"),
            description=base.get("description"),
            extra_data=extra_data,
            confidence=float(data.get("confidence", 0.0)),
            warnings=data.get("warnings", []),
        )

        logger.info(
            "Scan complete | category=%s confidence=%.2f extra_fields=%s",
            category.name,
            result.confidence,
            list(extra_data.keys()),
        )
        return result

    except json.JSONDecodeError as e:
        logger.error("Failed to parse GPT-4o response as JSON: %s", e)
        return TransactionScanResult(
            confidence=0.0,
            warnings=["No se pudo procesar la imagen. Intentá con una imagen más clara."],
        )

    except Exception as e:
        logger.error("Transaction scan error: %s", e)
        raise
