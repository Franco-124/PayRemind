# Design: Invoice Emit & Finance Integration

## Overview

Se extiende el backend de PayRemind en tres ejes:

1. **Emisión de facturas**: nuevo endpoint `POST /invoices/emit` que genera un número
   auto-incremental, calcula el total desde ítems de línea, produce un PDF en memoria
   y lo envía al cliente por email. La factura queda lista para el scheduler de recordatorios.
2. **Descarga de PDF**: `GET /invoices/{id}/pdf` regenera el PDF on-demand desde los datos
   persistidos y lo devuelve como stream descargable.
3. **Transacción desde scan**: `POST /finance/transactions/from-scan` convierte un
   `InvoiceScanResult` (ya obtenido del endpoint de scan existente) en una transacción
   financiera persistida.

El auto-incremento de `invoice_number` también aplica al endpoint `POST /invoices/`
existente: `invoice_number` deja de ser un campo que el cliente provea.

---

## Components

### New / Modified Files

| File | Role | Change type |
|------|------|-------------|
| `backend/app/models/user.py` | Agrega columna `invoice_counter` | Modify |
| `backend/app/models/invoice.py` | Agrega columnas `items`, `issued_date`, `sent_at` | Modify |
| `backend/app/schemas/invoice.py` | Nuevos schemas `InvoiceItem`, `InvoiceEmitRequest`, `InvoiceEmitResponse`; `invoice_number` opcional en `InvoiceCreate` | Modify |
| `backend/app/schemas/transaction.py` | Nuevo schema `TransactionFromScanRequest` | Modify |
| `backend/app/services/pdf_service.py` | Genera PDF de factura con fpdf2 | **Create** |
| `backend/app/services/invoice_service.py` | Agrega `emit_invoice`, `get_invoice_pdf`, `_next_invoice_number`; adapta `create_invoice` | Modify |
| `backend/app/services/email_service.py` | Agrega `send_invoice_email` con adjunto PDF | Modify |
| `backend/app/services/finance_service.py` | Agrega `create_transaction_from_scan` | Modify |
| `backend/app/routers/invoices.py` | Agrega `POST /emit`, `GET /{id}/pdf` | Modify |
| `backend/app/routers/finance.py` | Agrega `POST /transactions/from-scan` | Modify |
| `backend/alembic/versions/<hash>_invoice_emit.py` | Migración: columnas nuevas en `users` e `invoices` | **Create** |
| `backend/requirements.txt` | Agrega `fpdf2` | Modify |

---

## Key Abstractions

### `InvoiceItem` (Pydantic schema)
- **Responsabilidad**: representar un ítem de línea de la factura.
- **Campos**: `description: str`, `quantity: float`, `unit_price: float`
- `total` se calcula en el backend; no lo provee el cliente.

### `pdf_service.generate_invoice_pdf(invoice, user, client) -> bytes`
- **Responsabilidad**: construir el PDF de la factura en memoria con fpdf2.
- **Input**: ORM objects `Invoice` (con `items`, `issued_date`), `User`, `Client`
- **Output**: bytes del PDF (en memoria, sin tocar disco)
- **Estructura del PDF**:
  - Encabezado: nombre del freelancer (`user.full_name`), número de factura, fechas
  - Bloque del cliente: nombre, email, empresa
  - Tabla de ítems: descripción | cantidad | precio unit. | total
  - Línea de total
  - Notas al pie (si existen)

### `invoice_service._next_invoice_number(user_id, db) -> str`
- **Responsabilidad**: incrementar atómicamente `users.invoice_counter` y retornar el
  número formateado.
- **Implementación**: SQL raw atómico:
  ```sql
  UPDATE users
  SET invoice_counter = invoice_counter + 1
  WHERE id = :uid
  RETURNING invoice_counter
  ```
- **Output**: `"INV-0001"`, `"INV-0042"`, etc.
- **Concurrencia**: seguro — el UPDATE es atómico en PostgreSQL.

### `invoice_service.emit_invoice(user_id, data, db) -> Invoice`
- **Responsabilidad**: orquestar la emisión completa.
- **Pasos**: asignar número → calcular total → persistir → generar PDF → enviar email

### `email_service.send_invoice_email(to, client_name, freelancer_name, invoice, pdf_bytes) -> bool`
- **Responsabilidad**: enviar el email de emisión de factura con el PDF adjunto via Resend.
- Función separada de `send_email` para no contaminar la firma del reminder con params de attachment.

### `finance_service.create_transaction_from_scan(user_id, data, db) -> Transaction`
- **Responsabilidad**: construir y persistir una transacción a partir de los campos del
  scan, usando overrides del usuario cuando se proveen y fallbacks cuando no.
- `amount` es requerido: si ni `data.amount` ni `scan_result.amount` existen → 422.

---

## Data Flow

### Flujo 1 — `POST /invoices/emit`

```
Cliente Flutter
  │
  ├─ POST /invoices/emit  {client_id, items, currency, due_date, notes, issued_date}
  │
  ▼
router.emit_invoice()
  │
  ├─ Verifica plan free (límite 3 facturas activas)
  ├─ Verifica que client pertenece al user
  ├─ _next_invoice_number(user_id, db)  ← UPDATE atómico en users.invoice_counter
  ├─ Calcula total = Σ(item.quantity × item.unit_price)
  ├─ Persiste Invoice(invoice_number, items, amount=total, issued_date, sent_at=None)
  ├─ generate_invoice_pdf(invoice, user, client) → pdf_bytes
  ├─ send_invoice_email(client.email, ..., pdf_bytes)
  ├─ invoice.sent_at = now()  →  db.commit()
  └─ Retorna InvoiceEmitResponse
```

### Flujo 2 — `GET /invoices/{id}/pdf`

```
Cliente Flutter
  │
  ├─ GET /invoices/{id}/pdf
  │
  ▼
router.download_invoice_pdf()
  │
  ├─ get_invoice(id, user_id, db)  ← verifica ownership
  ├─ Verifica que invoice.items no sea null (es una factura emitida)
  ├─ generate_invoice_pdf(invoice, user, client) → pdf_bytes
  └─ Retorna StreamingResponse(pdf_bytes, media_type="application/pdf",
       headers={"Content-Disposition": f"attachment; filename=factura-{invoice_number}.pdf"})
```

### Flujo 3 — `POST /finance/transactions/from-scan`

```
Cliente Flutter
  │
  ├─ (previo) POST /invoices/scan → InvoiceScanResult
  │
  ├─ POST /finance/transactions/from-scan
  │   {scan_result, type, category_id, date?, description?, amount?, currency?}
  │
  ▼
router.transaction_from_scan()
  │
  ├─ Resuelve amount:      data.amount ?? scan_result.amount ?? → 422 si ninguno
  ├─ Resuelve currency:    data.currency ?? scan_result.currency ?? "USD"
  ├─ Resuelve date:        data.date ?? scan_result.due_date ?? date.today()
  ├─ Resuelve description: data.description ?? scan_result.description ?? "Transacción"
  ├─ Verifica que category_id existe
  └─ create_transaction(user_id, TransactionCreate(...), db, invoice_id=None, is_automatic=False)
     → Retorna TransactionResponse
```

---

## API / Interface Contracts

### `POST /invoices/emit`
```
Request body: InvoiceEmitRequest
  client_id:   str
  items:       list[InvoiceItem]   — mínimo 1 ítem
  currency:    str = "USD"
  due_date:    date
  notes:       str | null
  issued_date: date | null         — default: today en el backend

Response 201: InvoiceEmitResponse
  (todos los campos de InvoiceResponse + items, issued_date, sent_at)

Errors:
  400 — items vacío
  403 — free_plan_limit_reached | cliente no pertenece al usuario
  404 — cliente no encontrado
  502 — fallo de envío de email (la factura se creó igual, solo falla el email)
```

### `GET /invoices/{id}/pdf`
```
Response 200: application/pdf (StreamingResponse)
  Content-Disposition: attachment; filename="factura-INV-0001.pdf"

Errors:
  404 — factura no encontrada
  403 — no autorizado
  400 — esta factura no tiene ítems (fue creada por el flujo manual antiguo)
```

### `POST /finance/transactions/from-scan`
```
Request body: TransactionFromScanRequest
  scan_result:  InvoiceScanResult
  type:         "income" | "expense"
  category_id:  str
  date:         date | null
  description:  str | null
  amount:       float | null
  currency:     str | null

Response 201: TransactionResponse

Errors:
  422 — amount no disponible (ni en request ni en scan_result)
  404 — categoría no encontrada
```

### `InvoiceCreate` (modificado)
```
invoice_number: str | null   — ahora opcional; se auto-asigna si no se provee
```

---

## Schema Changes (modelos ORM)

### `users` table — nueva columna
```python
invoice_counter: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
```

### `invoices` table — nuevas columnas
```python
items:       Mapped[dict | None] = mapped_column(JSONB, nullable=True)
issued_date: Mapped[date | None] = mapped_column(Date, nullable=True)
sent_at:     Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

`items` almacena la lista de ítems como JSONB:
```json
[{"description": "Diseño web", "quantity": 1.0, "unit_price": 500.0, "total": 500.0}]
```

---

## Edge Cases & Error Handling

- **items vacío** → 422 en validación Pydantic (`min_length=1` en la lista)
- **total = 0** → 422 (`amount` debe ser > 0, ya validado en `Invoice.amount`)
- **Email falla** → la factura se persistió igual; `sent_at` queda `null`; responde 201 con un warning en el response body: `{"sent": false, "error": "email_delivery_failed"}`
- **`invoice_counter` concurrencia** → el UPDATE atómico garantiza unicidad; no se usa SELECT + UPDATE
- **PDF de factura manual (sin `items`)** → `GET /{id}/pdf` retorna 400 con mensaje claro
- **`amount` faltante en from-scan** → 422 inmediato antes de consultar la DB
- **`category_id` inválido en from-scan** → 404 con mensaje "Category not found"
- **`issued_date` null en PDF** → usar `invoice.created_at.date()` como fallback

## Open Questions for Implementation

- Confirmar que `resend` Python SDK acepta `attachments` con bytes directamente o
  requiere base64 — verificar al implementar `send_invoice_email`.
- Confirmar que `fpdf2` está disponible en Railway (pure Python, sin deps de sistema —
  debería funcionar sin problema).
