# Implementation Plan: Smart Transaction Scan

## Tasks

- [x] **Task 1**: Eliminar `invoice_scan.py`, `invoice_scan_service.py`, `invoice_scan.py` (schema)
- [x] **Task 2**: Limpiar `main.py` — quitar import y registro de `invoice_scan_router`
- [x] **Task 3**: Actualizar `models/transaction.py` — `scan_fields` en Category, `extra_data` en Transaction
- [x] **Task 4**: Actualizar `schemas/transaction.py` — quitar `TransactionFromScanRequest`, agregar `TransactionScanResult` y `extra_data`
- [x] **Task 5**: Actualizar `data/default_categories.py` — `scan_fields` en las 17 categorías
- [x] **Task 6**: Crear `services/transaction_scan_service.py`
- [x] **Task 7**: Actualizar `routers/finance.py` — quitar `from-scan`, agregar `POST /transactions/scan`; limpiar `finance_service.py`
- [x] **Task 8**: Crear migración Alembic `f4a5b6c7d8e9`

## Execution Log

### Task 1 — Eliminar archivos invoice_scan
Status: ✅ Done
Notes: `git rm` de los 3 archivos. No dejan rastro en el proyecto.

### Task 2 — main.py
Status: ✅ Done
Notes: Eliminados import de `invoice_scan_router` y `app.include_router(invoice_scan_router...)`.

### Task 3 — Modelos
Status: ✅ Done
Notes: `scan_fields` (PG_JSONB nullable) en `Category`. `extra_data` (PG_JSONB nullable) en `Transaction`. Import de `PG_JSONB` agregado.

### Task 4 — Schemas
Status: ✅ Done
Notes: `TransactionFromScanRequest` eliminado. Import de `InvoiceScanResult` eliminado. `TransactionScanResult` nuevo. `extra_data: Optional[dict]` en `TransactionCreate` y `TransactionResponse`. `scan_fields: Optional[list]` en `CategoryResponse`.

### Task 5 — Seed data
Status: ✅ Done
Notes: Las 17 categorías tienen `scan_fields` definidos. Categorías sin campos extras tienen lista vacía `[]`.

### Task 6 — transaction_scan_service.py
Status: ✅ Done
Notes: Prompt dinámico construido desde `scan_fields` de la categoría + 4 campos base. Separa campos base de `extra_data` en el resultado. Retorna `None` si category_id no existe (el router lo convierte en 404). Nunca lanza en JSON decode — retorna confidence 0.0.

### Task 7 — Router finance + finance_service
Status: ✅ Done
Notes: `POST /transactions/from-scan` eliminado. `POST /transactions/scan` agregado antes de `GET /transactions` (evita conflicto de rutas). `create_transaction_from_scan` eliminado de `finance_service.py`. `extra_data` pasado al constructor de `Transaction` via `hasattr` para mantener compatibilidad con llamadas sin ese campo.

### Task 8 — Migración
Status: ✅ Done
Notes: Revision `f4a5b6c7d8e9`, down `e3f4a5b6c7d8`. Agrega columnas + UPDATE de `scan_fields` en las categorías seed existentes. Usa `json.dumps()` para serializar correctamente el array JSONB.
