# Implementation Plan: Invoice Emit & Finance Integration

## Tasks

- [x] **Task 1**: Agregar `invoice_counter` al modelo `User` — `backend/app/models/user.py`
- [x] **Task 2**: Agregar `items`, `issued_date`, `sent_at` al modelo `Invoice` — `backend/app/models/invoice.py`
- [x] **Task 3**: Actualizar schemas de invoice (`InvoiceItem`, `InvoiceEmitRequest`, `InvoiceEmitResponse`, `invoice_number` opcional) — `backend/app/schemas/invoice.py`
- [x] **Task 4**: Agregar `TransactionFromScanRequest` a schemas de transacción — `backend/app/schemas/transaction.py`
- [x] **Task 5**: Crear `pdf_service.py` con `generate_invoice_pdf` — `backend/app/services/pdf_service.py`
- [x] **Task 6**: Agregar `send_invoice_email` con adjunto PDF a `email_service.py` — `backend/app/services/email_service.py`
- [x] **Task 7**: Agregar `_next_invoice_number`, `emit_invoice`, `get_invoice_pdf_bytes` a `invoice_service.py` — `backend/app/services/invoice_service.py`
- [x] **Task 8**: Agregar `create_transaction_from_scan` a `finance_service.py` — `backend/app/services/finance_service.py`
- [x] **Task 9**: Agregar endpoints `POST /emit` y `GET /{id}/pdf` a `routers/invoices.py` — `backend/app/routers/invoices.py`
- [x] **Task 10**: Agregar endpoint `POST /transactions/from-scan` a `routers/finance.py` — `backend/app/routers/finance.py`
- [x] **Task 11**: Agregar `fpdf2` a `requirements.txt` — `backend/requirements.txt`
- [x] **Task 12**: Crear migración Alembic — `backend/alembic/versions/e3f4a5b6c7d8_invoice_emit.py`

## Execution Log

### Task 1 — User.invoice_counter
Status: ✅ Done
Notes: Agregada columna `Integer, nullable=False, default=0` en `users`. Import de `Integer` añadido.

### Task 2 — Invoice new columns
Status: ✅ Done
Notes: `items` (PG_JSONB nullable), `issued_date` (Date nullable), `sent_at` (DateTime+tz nullable). Import separado de `PG_JSONB` para no colisionar con el `JSONB` ya importado.

### Task 3 — Invoice schemas
Status: ✅ Done
Notes: `InvoiceItem` nuevo, `InvoiceEmitRequest` nuevo, `InvoiceEmitResponse` nuevo. `invoice_number` en `InvoiceCreate` pasó a `Optional[str] = None`. `InvoiceResponse` extendido con `items`, `issued_date`, `sent_at`.

### Task 4 — TransactionFromScanRequest
Status: ✅ Done
Notes: Sin `fill_with_ai` — campo eliminado per clarification Q4. `type` validado con regex pattern. Import de `InvoiceScanResult` desde `app.schemas.invoice_scan`.

### Task 5 — pdf_service.py
Status: ✅ Done
Notes: PDF simple con fpdf2 — header con color de marca, tabla de ítems con filas alternadas, total destacado, notas al pie opcionales. Genera en BytesIO, nunca toca disco.

### Task 6 — send_invoice_email
Status: ✅ Done
Notes: Función separada de `send_email` para mantener firma limpia. PDF se adjunta como base64. Subject y body siempre en español.

### Task 7 — invoice_service emit functions
Status: ✅ Done
Notes: `_next_invoice_number` usa UPDATE atómico con RETURNING — seguro para concurrencia. `emit_invoice` retorna `(invoice, email_sent)` para que el router informe si el email llegó. `get_invoice_pdf_bytes` regenera on-demand. `create_invoice` auto-asigna número si `invoice_number` no se provee.

### Task 8 — create_transaction_from_scan
Status: ✅ Done
Notes: Resolución en cascada: override → scan_result → fallback. 422 si amount no disponible en ningún lado. 404 si category_id inválido.

### Task 9 — invoices router new endpoints
Status: ✅ Done
Notes: `POST /emit` antes de `GET /` para evitar que FastAPI intente resolver "emit" como `{invoice_id}`. `GET /{id}/pdf` retorna StreamingResponse con Content-Disposition.

### Task 10 — finance router from-scan endpoint
Status: ✅ Done
Notes: `POST /transactions/from-scan` registrado antes de `DELETE /transactions/{id}` para que FastAPI no lo confunda con un path param.

### Task 11 — requirements.txt
Status: ✅ Done
Notes: `fpdf2==2.8.1` agregado.

### Task 12 — Alembic migration
Status: ✅ Done
Notes: Revision `e3f4a5b6c7d8`, down_revision `d2e3f4a5b6c7`. `server_default="0"` en `invoice_counter` para que usuarios existentes arranquen en 0 sin error. JSONB importado explícitamente de `sqlalchemy.dialects.postgresql`.
