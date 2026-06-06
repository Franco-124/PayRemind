# Design: Smart Transaction Scan

## Overview

Se reemplaza el sistema de scan genérico (basado en facturas) por uno enfocado
exclusivamente en el módulo de finanzas. Cada categoría declara qué campos debe
intentar extraer GPT cuando se sube una imagen. El endpoint devuelve los datos
pre-extraídos para que Flutter pre-llene el formulario; el usuario confirma/edita
y crea la transacción con el flujo normal. Los tres archivos de `invoice_scan` se
eliminan del proyecto.

---

## Components

### Archivos a ELIMINAR

| Archivo | Razón |
|---|---|
| `backend/app/routers/invoice_scan.py` | Endpoint eliminado |
| `backend/app/services/invoice_scan_service.py` | Reemplazado por transaction_scan_service |
| `backend/app/schemas/invoice_scan.py` | Schema obsoleto |

### Archivos a MODIFICAR

| Archivo | Cambio |
|---|---|
| `backend/app/main.py` | Quitar import y registro de `invoice_scan_router` |
| `backend/app/models/transaction.py` | Agregar `scan_fields` a `Category`, `extra_data` a `Transaction` |
| `backend/app/schemas/transaction.py` | Quitar `TransactionFromScanRequest` + import de `InvoiceScanResult`; agregar `TransactionScanResult`, `extra_data` a `TransactionCreate` y `TransactionResponse` |
| `backend/app/routers/finance.py` | Quitar `POST /transactions/from-scan`; agregar `POST /transactions/scan` |
| `backend/app/data/default_categories.py` | Agregar `scan_fields` a cada categoría |
| `backend/requirements.txt` | Sin cambios (openai ya está) |

### Archivos a CREAR

| Archivo | Rol |
|---|---|
| `backend/app/services/transaction_scan_service.py` | Lógica de scan category-aware con GPT-4o Vision |
| `backend/alembic/versions/<hash>_transaction_scan.py` | Migración: `scan_fields` en categories, `extra_data` en transactions; UPDATE seed |

---

## Key Abstractions

### `scan_fields` en `Category`
```python
scan_fields: Mapped[list | None] = mapped_column(PG_JSONB, nullable=True)
```
Lista de strings con los nombres de campos extras que GPT debe buscar en la imagen.
Ejemplo: `["vendor_name", "billing_period"]`

Los **campos base** (`amount`, `currency`, `date`, `description`) siempre se extraen
para cualquier categoría — no se listan en `scan_fields`.

### `extra_data` en `Transaction`
```python
extra_data: Mapped[dict | None] = mapped_column(PG_JSONB, nullable=True)
```
Guarda los campos adicionales extraídos o confirmados por el usuario.
Ejemplo: `{"vendor_name": "McDonald's"}`. Null para transacciones sin scan.

### `transaction_scan_service.scan_for_transaction(category_id, image_bytes, content_type, db) -> TransactionScanResult`
- Carga la categoría y sus `scan_fields`
- Construye prompt dinámico listando los campos base + los de la categoría
- Llama GPT-4o Vision con `detail="high"`
- Parsea respuesta JSON
- Retorna `TransactionScanResult` con `extra_data` separado de los campos base

### `TransactionScanResult` (nuevo schema)
```python
class TransactionScanResult(BaseModel):
    amount:      Optional[float]
    currency:    Optional[str]
    date:        Optional[str]       # YYYY-MM-DD
    description: Optional[str]
    extra_data:  dict = {}           # campos extras según scan_fields de la categoría
    confidence:  float = 0.0
    warnings:    list[str] = []
```

---

## Data Flow

### `POST /finance/transactions/scan`

```
Cliente Flutter
  │
  ├─ multipart/form-data:
  │   ├─ file: imagen JPG/PNG
  │   └─ category_id: "uuid-alimentacion"
  │
  ▼
router.scan_transaction_image()
  │
  ├─ Valida content_type y tamaño (mismo que antes: JPG/PNG, max 10MB)
  ├─ scan_for_transaction(category_id, image_bytes, content_type, db)
  │   ├─ Carga Category → lee scan_fields (ej: ["vendor_name"])
  │   ├─ Construye prompt:
  │   │   "Extraé estos campos: amount, currency, date, description, vendor_name"
  │   ├─ GPT-4o Vision → JSON
  │   ├─ Separa campos base de extra_data
  │   └─ Retorna TransactionScanResult
  │
  └─ Response 200: TransactionScanResult
```

### `POST /finance/transactions` (flujo existente + extra_data)

```
Cliente Flutter (después de confirmar el scan)
  │
  ├─ POST /finance/transactions {
  │     category_id, type, amount, currency, date, description,
  │     extra_data: {"vendor_name": "McDonald's"}   ← nuevo campo opcional
  │   }
  │
  ▼
finance_service.create_transaction()  (sin cambios de lógica)
  │
  └─ Persiste transaction con extra_data
```

---

## API / Interface Contracts

### `POST /finance/transactions/scan`
```
Content-Type: multipart/form-data

Form fields:
  file:        UploadFile  — JPG o PNG, max 10MB
  category_id: str         — UUID de categoría existente

Response 200: TransactionScanResult
  {
    "amount": 45.50,
    "currency": "USD",
    "date": "2026-06-05",
    "description": "Almuerzo",
    "extra_data": { "vendor_name": "McDonald's" },
    "confidence": 0.88,
    "warnings": []
  }

Errors:
  400 — formato no soportado / archivo vacío / archivo muy grande
  404 — category_id no encontrado
```

### `POST /finance/transactions` (modificado)
```
Body agrega campo opcional:
  extra_data: dict | null   — default null
```

### Prompt dinámico a GPT-4o

```
Sos un asistente que extrae datos de comprobantes, recibos y facturas.
Categoría del gasto: {category_name} ({category_type})

Extraé EXACTAMENTE estos campos del comprobante:
- amount: número sin símbolos (ej: 45.50)
- currency: código de moneda (ej: USD, COP, EUR)
- date: fecha en formato YYYY-MM-DD
- description: breve descripción del gasto/ingreso
{extra_fields_list}

Reglas:
1. Respondé SOLO con JSON válido, sin texto adicional
2. Si un campo no está en la imagen → null
3. confidence: 0.0 a 1.0 según claridad de los datos
4. warnings: lista de campos que no pudiste encontrar

Formato:
{
  "amount": ...,
  "currency": ...,
  "date": ...,
  "description": ...,
  {extra_fields_json},
  "confidence": ...,
  "warnings": [...]
}
```

---

## `scan_fields` por categoría (seed data)

```python
# Ingresos
"Pago de factura"     → ["client_name", "invoice_number"]
"Proyecto freelance"  → ["client_name", "project_name"]
"Consultoría"         → ["client_name"]
"Productos digitales" → ["product_name"]
"Inversiones"         → ["instrument_name"]
"Otros ingresos"      → []

# Gastos
"Alimentación"        → ["vendor_name"]
"Transporte"          → ["provider_name", "destination"]
"Servicios"           → ["provider_name"]
"Suscripciones"       → ["service_name", "billing_period"]
"Software y tools"    → ["tool_name", "billing_period"]
"Marketing"           → ["vendor_name"]
"Educación"           → ["institution_name", "course_name"]
"Salud"               → ["provider_name"]
"Vivienda"            → ["concept"]
"Entretenimiento"     → ["venue_name"]
"Otros gastos"        → []
```

---

## Edge Cases & Error Handling

- **Categoría sin scan_fields** → GPT extrae solo los 4 campos base; `extra_data: {}`
- **GPT no encuentra ningún campo** → `confidence: 0.0`, `warnings` con todos los campos; nunca 500
- **JSON mal formado en respuesta GPT** → `TransactionScanResult` con todo null y `confidence: 0.0`
- **category_id inválido** → 404 antes de llamar a GPT (no gastar tokens)
- **extra_data null en TransactionCreate** → se guarda null en DB, no hay error

## Open Questions for Implementation

- Verificar que GPT-4o puede parsear recibos en español (nombres de negocios en español,
  fechas en formato `DD/MM/YYYY`) — el prompt maneja esto con la regla de formato de fecha.
