# Clarifications: Smart Transaction Scan

## Questions & Answers

**Q1: ¿Los campos de `extra_data` se muestran al usuario o se guardan silenciosamente?**
A: Siempre se muestran para confirmación. El usuario ve todos los campos extraídos
(incluyendo los extras de la categoría), puede editarlos, y luego confirma para crear
la transacción. Nada se guarda sin que el usuario lo apruebe.

**Q2: ¿Se elimina `POST /invoices/scan` del proyecto completamente?**
A: Sí, eliminación completa — archivos borrados, imports removidos, ruta no registrada.
La guía Flutter debe indicar explícitamente que ese endpoint ya no existe.

## Open Decisions

- Ninguno. Todas las ambigüedades están resueltas.

## Impacto consolidado

1. **Eliminar** `invoice_scan.py` (router, service, schema) — 3 archivos borrados.
2. **Eliminar** `TransactionFromScanRequest` de `schemas/transaction.py`.
3. **Eliminar** el import de `invoice_scan_router` en `main.py`.
4. **Eliminar** el endpoint `POST /transactions/from-scan` de `routers/finance.py`.
5. **Agregar** `scan_fields` (JSONB) a `categories` — define qué extrae GPT por categoría.
6. **Agregar** `extra_data` (JSONB nullable) a `transactions` — guarda campos extras.
7. **Agregar** `extra_data` opcional a `TransactionCreate` schema.
8. **Nuevo** endpoint `POST /finance/transactions/scan` — scan category-aware.
9. **Nuevo** `transaction_scan_service.py` — lógica de extracción con prompt específico.
10. **Nuevo** `TransactionScanResult` schema en `schemas/transaction.py`.
11. **Actualizar** seed data de las 17 categorías con sus `scan_fields`.
12. **Migración** Alembic para las dos columnas nuevas + UPDATE de seed.
