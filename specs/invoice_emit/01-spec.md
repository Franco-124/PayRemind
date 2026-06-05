# Spec: Invoice Emit & Finance Integration

## Problem

Actualmente los freelancers solo pueden **registrar** facturas existentes en PayRemind
(subiendo una imagen o ingresando datos). Esto implica que el flujo real de cobro sucede
fuera de la plataforma: el freelancer crea la factura en otro sistema, la envía al cliente
manualmente, y solo después la carga en PayRemind para que empiece el seguimiento.

Dos problemas derivados:

1. Las facturas **creadas fuera** no generan un PDF estandarizado que el cliente pueda
   recibir directamente desde PayRemind.
2. El endpoint de **invoice scan** (GPT-4o Vision) extrae datos de facturas de terceros
   pero esos datos no llegan al módulo financiero — el freelancer no puede registrar esa
   factura como ingreso/egreso en sus finanzas.

## Goals

- G1: Permitir al freelancer crear una factura **desde cero** en PayRemind con ítems de
  línea y notas opcionales, y que el sistema genere automáticamente el PDF y lo envíe al
  cliente por email. Sin impuestos — el total es la suma directa de los ítems.
- G2: Al crear y enviar la factura, **iniciar automáticamente los recordatorios** de cobro
  sin pasos adicionales.
- G3: Los **números de factura son auto-incrementales por usuario** (INV-0001, INV-0002…),
  sin necesidad de que el usuario los ingrese.
- G4: Desde el **invoice scan**, el freelancer puede crear una transacción financiera
  (ingreso o egreso) usando los datos extraídos por GPT-4o, con completado automático de
  campos faltantes si el usuario lo requiere.
- G5: Solo se toca el **backend**. El frontend Flutter recibirá una guía de integración
  al final.

## Non-Goals

- No se construye almacenamiento persistente de PDFs (S3 / Railway Volumes). El PDF se
  genera en memoria y se adjunta al email.
- No se modifica la UI web (Next.js).
- No se cambia el sistema de recordatorios automáticos (APScheduler) — ya funciona.
- No se construye un editor visual de facturas.
- No se implementa firma digital de PDFs.
- El invoice scan no crea automáticamente una factura en PayRemind — solo alimenta al
  módulo financiero con una transacción.

## Expected Behavior

### Flujo 1 — Emitir factura desde PayRemind

1. El freelancer llama `POST /invoices/emit` con ítems de línea, datos del cliente,
   fecha de vencimiento, notas opcionales.
2. El backend:
   a. Asigna número de factura automático (`INV-NNNN`) incrementando el contador del usuario.
   b. Calcula el `total` sumando los ítems (`quantity × unit_price` por ítem).
   c. Genera el PDF en memoria con los datos de la factura y del cliente.
   d. Envía el PDF al email del cliente con asunto y cuerpo adecuados.
   e. Persiste la factura con `status = "pending"` y `sent_at = now()`.
3. El scheduler de recordatorios automáticos ya tomará la factura desde el día siguiente.
4. Responde con la factura creada.

### Flujo 2 — Crear transacción desde scan

1. El freelancer primero llama `POST /invoices/scan` y recibe un `InvoiceScanResult`.
2. Luego llama `POST /finance/transactions/from-scan` con:
   - El resultado del scan (o los campos que quiera usar).
   - `type`: `"income"` o `"expense"`.
   - `category_id`: categoría a asignar.
   - Campos opcionales de override (description, date, amount).
3. Si hay campos faltantes y el usuario activa `fill_with_ai: true`, GPT completa los
   huecos (description si está vacía, fecha si no se detectó, etc.).
4. El backend crea y persiste la transacción, responde con `TransactionResponse`.

### Contratos de datos

**InvoiceItem:**

```
description: str       — descripción del ítem
quantity:    float     — cantidad (ej. 2.0 horas)
unit_price:  float     — precio por unidad
total:       float     — quantity * unit_price (calculado por el backend)
```

**InvoiceEmitRequest:**

```
client_id:    str           — UUID del cliente existente
items:        list[InvoiceItem]
currency:     str = "USD"
due_date:     date
notes:        str | null    — notas en el pie de la factura
issued_date:  date = today  — fecha de emisión
```

**InvoiceEmitResponse** = InvoiceResponse + campos extra:

```
invoice_number: str    — asignado automáticamente (INV-0001)
total:          float  — suma de todos los ítems; también se guarda en `amount`
items:          list[InvoiceItem]
sent_at:        datetime | null
issued_date:    date
```

**TransactionFromScanRequest:**

```
scan_result:    InvoiceScanResult   — resultado del POST /invoices/scan
type:           "income" | "expense"
category_id:    str                 — UUID de la categoría
date:           date | null         — override; si null, usa scan_result.due_date o today
description:    str | null          — override; si null, usa scan_result.description o AI
amount:         float | null        — override; si null, usa scan_result.amount
currency:       str | null          — override; si null, usa scan_result.currency o "USD"
fill_with_ai:   bool = false        — completa campos faltantes con GPT
```

## Constraints

- C1: El número de factura es global por usuario — formato `INV-{número:04d}`. El contador
  se guarda en la tabla `users` (nueva columna `invoice_counter`) o en una secuencia
  separada. Se debe ser seguro ante concurrencia (incremento atómico).
- C2: El PDF se genera con **reportlab** (pure Python, sin deps de sistema) o **fpdf2**.
  No se requiere wkhtmltopdf, weasyprint ni chrome headless.
- C3: El email con PDF adjunto usa la misma infraestructura `email_service.py` + Resend API.
  Se requiere soporte de attachments en Resend (soportado vía `attachments` param).
- C4: Las transacciones de scan no están vinculadas a ninguna `Invoice` del sistema (porque
  esa factura no existe en PayRemind) — `invoice_id = null`.
- C5: Backward compatibility: `POST /invoices/` sigue funcionando igual para quien
  ingresa datos manualmente sin PDF. `invoice_number` pasa a ser **opcional** en ese
  endpoint (si no se provee, se auto-asigna también).
- C6: Alembic migration idempotente para las nuevas columnas.

## Priority

**Alta.** Es el flujo de valor central del producto: pasar de "registro de facturas" a
"emisión de facturas". Define si PayRemind es una herramienta de tracking o una herramienta
de cobro real.
