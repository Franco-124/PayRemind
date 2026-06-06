# Spec: Smart Transaction Scan (category-aware)

## Problem

El flujo de scan de facturas anterior tenía dos problemas de diseño:

1. `POST /invoices/scan` servía para "registrar" una factura externa en PayRemind a partir
   de una imagen. Esto ya no tiene sentido: las facturas ahora se **crean** en PayRemind
   desde cero con `POST /invoices/emit`. Registrar una factura que ya existe fuera del
   sistema es redundante.

2. `POST /finance/transactions/from-scan` era un endpoint secundario que tomaba el
   resultado genérico del scan y lo convertía en transacción. El problema: GPT extraía
   campos de "factura" (número, cliente, email) que no son útiles para registrar un gasto
   o un ingreso rápido.

Lo que sí tiene valor es: el freelancer tiene un recibo o comprobante (físico o digital),
quiere registrarlo como transacción de gasto o ingreso, y GPT puede leer la imagen para
extraer los datos relevantes **según la categoría elegida** — evitando tipeo manual.

## Goals

- G1: Eliminar `POST /invoices/scan` y el router/service de invoice scan del proyecto.
- G2: Eliminar `POST /finance/transactions/from-scan` y `TransactionFromScanRequest`.
- G3: Cada categoría tiene una lista de `scan_fields` — los campos que GPT debe intentar
  extraer cuando se sube una imagen para esa categoría. Esto hace que el prompt sea
  específico y los resultados útiles.
- G4: Nuevo endpoint `POST /finance/transactions/scan` — recibe `category_id` + imagen,
  retorna los campos extraídos para pre-llenar el formulario de la transacción en Flutter.
  **No crea la transacción** — solo extrae datos. La creación sigue siendo `POST /finance/transactions`.
- G5: Las transacciones tienen un campo `extra_data` (JSONB) para guardar los campos
  adicionales extraídos que no entran en los campos base (amount, currency, date, description).
- G6: Actualizar las 17 categorías seed con sus `scan_fields` específicos.
- G7: Generar guía para que el agente Flutter actualice la integración.

## Non-Goals

- No se modifica `POST /invoices/emit` ni nada del módulo de facturas.
- No se guarda el PDF ni la imagen de la transacción.
- No se construye OCR propio — todo pasa por GPT-4o Vision.
- No se agrega un paso de confirmación en el backend — la IA extrae, el usuario confirma
  en Flutter y crea la transacción.

## Expected Behavior

### Flujo único — registrar transacción desde imagen

```
1. Usuario abre "Nueva transacción"
2. Selecciona categoría  →  "Alimentación" (expense)
3. Toca "Subir comprobante"  →  sube foto del ticket del restaurante
4. POST /finance/transactions/scan  {category_id, image}
5. Backend:
   a. Carga los scan_fields de la categoría ("Alimentación"):
      ["amount", "currency", "date", "vendor_name"]
   b. Construye prompt específico para GPT-4o Vision con esos campos
   c. GPT extrae lo que encuentra en la imagen
   d. Retorna TransactionScanResult con los campos extraídos
6. Flutter pre-llena el formulario con los datos extraídos
7. Usuario revisa, ajusta si es necesario
8. POST /finance/transactions  (flujo normal, ahora con extra_data opcional)
```

### `scan_fields` por categoría

Los campos base que GPT **siempre** intenta extraer son: `amount`, `currency`, `date`,
`description`. Los `scan_fields` de la categoría agregan campos extras:

| Categoría | scan_fields extras |
|---|---|
| Pago de factura | `client_name`, `invoice_number` |
| Proyecto freelance | `client_name`, `project_name` |
| Consultoría | `client_name` |
| Productos digitales | `product_name` |
| Inversiones | `instrument_name` |
| Otros ingresos | — |
| Alimentación | `vendor_name` |
| Transporte | `provider_name`, `destination` |
| Servicios | `provider_name` |
| Suscripciones | `service_name`, `billing_period` |
| Software y tools | `tool_name`, `billing_period` |
| Marketing | `vendor_name` |
| Educación | `institution_name`, `course_name` |
| Salud | `provider_name` |
| Vivienda | `concept` |
| Entretenimiento | `venue_name` |
| Otros gastos | — |

### Contrato de `TransactionScanResult`

```
amount:       float | null
currency:     str | null
date:         str | null        — YYYY-MM-DD
description:  str | null
extra_data:   dict              — campos extras según scan_fields de la categoría
confidence:   float             — 0.0 a 1.0
warnings:     list[str]
```

`extra_data` solo contiene los campos que GPT encontró. Ejemplo para "Alimentación":
```json
{ "vendor_name": "McDonald's" }
```

### Contrato de `TransactionCreate` (actualizado)

Agregar campo opcional `extra_data: dict | null` al schema existente.
Se guarda tal cual en `transactions.extra_data` (JSONB).

## Constraints

- C1: Los `scan_fields` se guardan en `categories.scan_fields` como JSONB array de strings.
  Se actualizan vía migración en la data seed existente (UPDATE, no INSERT).
- C2: `Transaction.extra_data` es JSONB nullable — las transacciones creadas manualmente
  sin scan simplemente no tienen este campo (null).
- C3: El endpoint de scan es `multipart/form-data` igual que el anterior: campo `file`
  (JPG/PNG, max 10MB) + campo `category_id` como form field.
- C4: Los archivos a eliminar son:
  - `backend/app/routers/invoice_scan.py`
  - `backend/app/services/invoice_scan_service.py`
  - `backend/app/schemas/invoice_scan.py`
  - El import de `invoice_scan_router` en `main.py`
  - El endpoint `POST /transactions/from-scan` en `finance.py`
  - `TransactionFromScanRequest` de `schemas/transaction.py`
- C5: `InvoiceScanResult` schema se elimina junto con `invoice_scan.py`.
  Si hay referencias en `transaction.py`, se eliminan.

## Priority

**Alta.** Reemplaza completamente los dos endpoints de scan por uno más útil y cohesivo
con el módulo de finanzas.
