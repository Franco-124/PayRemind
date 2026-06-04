import base64
import json
import logging
import re

from openai import OpenAI

from app.config import settings
from app.schemas.invoice_scan import InvoiceScanResult

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """
Eres un asistente especializado en extraer datos de facturas e invoices.
Tu tarea es analizar la imagen y extraer la información de forma precisa.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con JSON válido
2. No agregues explicaciones fuera del JSON
3. Si un campo no está en la imagen → null
4. El monto debe ser solo el número (sin símbolos)
5. La fecha debe estar en formato YYYY-MM-DD
6. Si hay múltiples montos, extrae el TOTAL
7. confidence: 0.0 a 1.0 según qué tan claros están los datos en la imagen

FORMATO DE RESPUESTA (JSON estricto):
{
  "invoice_number": "INV-001" o null,
  "amount": 1500.00 o null,
  "currency": "USD" o "COP" o "EUR" etc. o null,
  "due_date": "2026-06-15" o null,
  "client_name": "Nombre del cliente" o null,
  "client_email": "email@cliente.com" o null,
  "description": "descripción del servicio" o null,
  "confidence": 0.85,
  "raw_text": "todo el texto visible en la imagen",
  "warnings": ["campo X no encontrado", ...]
}
"""


def scan_invoice_image(image_bytes: bytes, content_type: str) -> InvoiceScanResult:
    """Send an invoice image to GPT-4o Vision and return the extracted data.

    Args:
        image_bytes: raw bytes of the image
        content_type: "image/jpeg" or "image/png"

    Returns:
        InvoiceScanResult with extracted fields and confidence score.
        Never raises on model/parsing failure — returns a zero-confidence result instead.
    """
    client = OpenAI(api_key=settings.openai_api_key)

    try:
        image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        logger.info("Sending invoice image to GPT-4o Vision (%d bytes)", len(image_bytes))

        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1000,
            messages=[
                {
                    "role": "system",
                    "content": _SYSTEM_PROMPT,
                },
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
                        {
                            "type": "text",
                            "text": "Extrae todos los datos de esta factura.",
                        },
                    ],
                },
            ],
        )

        raw_content = response.choices[0].message.content or ""
        logger.info("GPT-4o Vision response received")

        # GPT sometimes wraps the JSON in ```json ... ``` despite instructions
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw_content.strip())
        data = json.loads(cleaned)
        result = InvoiceScanResult(**data)

        found_fields = [
            k for k, v in result.model_dump().items()
            if v is not None and k not in ("confidence", "raw_text", "warnings")
        ]
        logger.info(
            "Invoice scan completed | confidence=%.2f | found=%s",
            result.confidence,
            found_fields,
        )
        return result

    except json.JSONDecodeError as e:
        logger.error("Failed to parse GPT-4o response as JSON: %s", e)
        return InvoiceScanResult(
            confidence=0.0,
            warnings=["No se pudo procesar la imagen. Intenta con una imagen más clara."],
        )

    except Exception as e:
        logger.error("Invoice scan error: %s", e)
        raise
