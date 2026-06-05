# PayRemind — Guía de integración: Invoice Emit & Finance desde Scan

> **Para el agente Claude Code.**
> Esta guía describe exactamente qué cambió en el backend y qué tenés que construir o
> modificar en el proyecto Flutter para integrar estas dos nuevas capacidades:
>
> 1. Emitir facturas desde la app (con PDF generado automáticamente)
> 2. Registrar transacciones financieras a partir de un scan de factura

---

## Contexto: qué cambió en el backend

Antes, el módulo de facturas solo permitía **registrar** facturas que ya existían fuera
de PayRemind. El freelancer creaba la factura en otro sistema, la subía como imagen o
ingresaba los datos manualmente, y PayRemind solo hacía el seguimiento de cobro.

**Ahora el backend puede:**

- Crear una factura **desde cero** con ítems de línea, calcular el total y enviar el PDF
  directamente al cliente por email en un solo llamado.
- El número de factura (`INV-0001`, `INV-0002`…) es **auto-generado por el backend** —
  ya no se provee desde la app.
- El PDF se puede descargar desde la app vía un endpoint dedicado.
- Los datos extraídos por el scan de facturas (GPT-4o) ahora se pueden convertir en una
  transacción financiera (ingreso o egreso) en el módulo de finanzas.

---

## Cambios que impactan código Flutter existente

### ⚠️ `invoice_number` ya no se envía al crear facturas

Si en el proyecto Flutter existe algún formulario o modelo que envíe `invoice_number`
al hacer `POST /invoices/`, **eliminá ese campo**. El backend lo asigna solo.

Buscá en el proyecto cualquier referencia a `'invoice_number'` dentro de un `toJson()`
o body de request para `POST /invoices/` y removela.

```dart
// ANTES — quitar esto:
final body = {
  'client_id': clientId,
  'invoice_number': 'FAC-001',   // ← eliminar
  'amount': 500.00,
  'due_date': '2026-07-01',
};

// AHORA — así debe quedar:
final body = {
  'client_id': clientId,
  'amount': 500.00,
  'due_date': '2026-07-01',
};
```

### ⚠️ El modelo `Invoice` en Dart ahora tiene campos nuevos

El backend retorna tres campos nuevos en todas las respuestas de factura. Actualizá el
modelo `Invoice` (o como se llame en el proyecto) para incluirlos:

```dart
// Agregar estos campos al modelo Invoice existente:
final List<InvoiceItem>? items;    // null si fue creada manualmente
final String? issuedDate;          // YYYY-MM-DD, puede ser null
final String? sentAt;              // ISO datetime, null si no se envió por email
```

Y en el `fromJson`:

```dart
items: json['items'] != null
    ? (json['items'] as List).map((i) => InvoiceItem.fromJson(i)).toList()
    : null,
issuedDate: json['issued_date'],
sentAt: json['sent_at'],
```

---

## Lo que tenés que construir

### 1. Modelo `InvoiceItem`

Nuevo modelo para los ítems de línea de una factura. Crealo en el mismo lugar donde
están los modelos de dominio (probablemente `lib/models/` o `lib/data/`).

```dart
class InvoiceItem {
  final String description;
  final double quantity;
  final double unitPrice;
  final double? total; // calculado por el backend, viene en la respuesta

  InvoiceItem({
    required this.description,
    required this.quantity,
    required this.unitPrice,
    this.total,
  });

  // toJson solo incluye los campos que el backend espera en el request
  Map<String, dynamic> toJson() => {
    'description': description,
    'quantity': quantity,
    'unit_price': unitPrice,
  };

  factory InvoiceItem.fromJson(Map<String, dynamic> json) => InvoiceItem(
    description: json['description'],
    quantity: (json['quantity'] as num).toDouble(),
    unitPrice: (json['unit_price'] as num).toDouble(),
    total: json['total'] != null ? (json['total'] as num).toDouble() : null,
  );
}
```

---

### 2. Servicio de emisión de facturas

Creá (o agregá al servicio de facturas existente) los tres métodos: emitir, descargar PDF
y abrir PDF. El cliente Dio ya existente funciona sin cambios — solo son llamadas nuevas.

```dart
// Agregar al servicio de facturas existente, o crear InvoiceEmitService

/// Emite una factura nueva con ítems de línea.
/// El backend genera el número, calcula el total y envía el PDF al cliente.
Future<Map<String, dynamic>> emitInvoice({
  required String clientId,
  required List<InvoiceItem> items,
  required String dueDate,       // YYYY-MM-DD
  String currency = 'USD',
  String? notes,
  String? issuedDate,            // YYYY-MM-DD, null = hoy
}) async {
  final response = await dio.post('/invoices/emit', data: {
    'client_id': clientId,
    'items': items.map((i) => i.toJson()).toList(),
    'currency': currency,
    'due_date': dueDate,
    if (notes != null) 'notes': notes,
    if (issuedDate != null) 'issued_date': issuedDate,
  });
  return response.data;
}

/// Descarga el PDF de una factura emitida y lo guarda en el directorio temporal.
/// Retorna la ruta del archivo guardado.
/// Lanza excepción si la factura no tiene ítems (fue creada manualmente).
Future<String> downloadInvoicePdf(String invoiceId, String invoiceNumber) async {
  final response = await dio.get(
    '/invoices/$invoiceId/pdf',
    options: Options(responseType: ResponseType.bytes),
  );
  final dir = await getTemporaryDirectory();
  final filePath = '${dir.path}/factura-$invoiceNumber.pdf';
  await File(filePath).writeAsBytes(response.data);
  return filePath;
}

/// Descarga y abre el PDF en el visor nativo del dispositivo.
Future<void> openInvoicePdf(String invoiceId, String invoiceNumber) async {
  final path = await downloadInvoicePdf(invoiceId, invoiceNumber);
  await OpenFile.open(path);
}
```

> **Dependencias a agregar en `pubspec.yaml` si no están:**
>
> - `path_provider` — para obtener directorio temporal
> - `open_file` — para abrir el PDF en el visor nativo del dispositivo

---

### 3. Pantalla de emisión de facturas (`InvoiceEmitScreen`)

Esta es la pantalla principal nueva. El usuario la usa para crear una factura desde cero.

**Qué debe mostrar:**

- Selector de cliente (dropdown o búsqueda, llama `GET /clients/` que ya existe)
- Lista dinámica de ítems — el usuario puede agregar/quitar filas con descripción,
  cantidad y precio unitario
- Total calculado en tiempo real en el frontend (`Σ quantity × unit_price`)
- Campo de fecha de vencimiento
- Campo de notas (opcional)
- Botón "Emitir factura"

**Comportamiento del botón:**

```
Presionar "Emitir factura"
  │
  ├─ Validar: al menos 1 ítem, todos los campos requeridos
  ├─ Mostrar loading: "Generando y enviando factura..."
  │
  ├─ Llamar POST /invoices/emit
  │
  ├─ Respuesta OK (201):
  │   ├─ Si response['sent'] == true:
  │   │   └─ SnackBar verde: "Factura ${response['invoice_number']} enviada a ${client.email}"
  │   └─ Si response['sent'] == false:
  │       └─ Dialog: "Factura creada correctamente (${response['invoice_number']}),
  │                   pero no se pudo enviar el email al cliente.
  │                   Podés reenviarla manualmente desde el detalle de la factura."
  │
  └─ Navegar a InvoiceDetailScreen con el id retornado
```

**El número de factura NO se muestra en el formulario** — el usuario no lo ingresa.
Se muestra solo en la pantalla de confirmación/detalle con el valor que devolvió el backend.

---

### 4. Botón "Descargar PDF" en el detalle de factura

En la pantalla de detalle de factura (`InvoiceDetailScreen`), agregá un botón que descargue
y abra el PDF. Este botón solo debe mostrarse si la factura tiene ítems (fue emitida desde
PayRemind, no registrada manualmente).

```dart
// Mostrar el botón solo si invoice.items != null && invoice.items!.isNotEmpty
if (invoice.items != null && invoice.items!.isNotEmpty)
  ElevatedButton.icon(
    icon: const Icon(Icons.picture_as_pdf),
    label: const Text('Descargar PDF'),
    onPressed: () async {
      try {
        setState(() => _loadingPdf = true);
        await invoiceService.openInvoicePdf(invoice.id, invoice.invoiceNumber);
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo generar el PDF')),
        );
      } finally {
        setState(() => _loadingPdf = false);
      }
    },
  ),
```

---

### 5. Modelo `TransactionFromScanRequest`

Nuevo modelo para el endpoint que convierte un scan en transacción financiera. Agregar
junto a los modelos de finanzas existentes.

```dart
class TransactionFromScanRequest {
  final InvoiceScanResult scanResult; // modelo ya existente del scan
  final String type;         // "income" o "expense"
  final String categoryId;
  final String? date;        // YYYY-MM-DD — si null, el backend usa due_date del scan o hoy
  final String? description; // si null, el backend usa description del scan o "Transacción"
  final double? amount;      // si null, el backend usa el amount del scan (si no hay ninguno → 422)
  final String? currency;    // si null, el backend usa currency del scan o "USD"

  TransactionFromScanRequest({
    required this.scanResult,
    required this.type,
    required this.categoryId,
    this.date,
    this.description,
    this.amount,
    this.currency,
  });

  Map<String, dynamic> toJson() => {
    'scan_result': scanResult.toJson(),
    'type': type,
    'category_id': categoryId,
    if (date != null) 'date': date,
    if (description != null) 'description': description,
    if (amount != null) 'amount': amount,
    if (currency != null) 'currency': currency,
  };
}
```

> **Importante:** `InvoiceScanResult` necesita tener un método `toJson()`. Si no lo tiene,
> agregarlo al modelo existente:
>
> ```dart
> Map<String, dynamic> toJson() => {
>   'invoice_number': invoiceNumber,
>   'amount': amount,
>   'currency': currency,
>   'due_date': dueDate,
>   'client_name': clientName,
>   'client_email': clientEmail,
>   'description': description,
>   'confidence': confidence,
>   'raw_text': rawText,
>   'warnings': warnings,
> };
> ```

---

### 6. Método en el servicio de finanzas

Agregá este método al servicio de finanzas existente (donde están los métodos para
transacciones y presupuestos):

```dart
/// Crea una transacción financiera a partir de los datos de un scan de factura.
/// amount es obligatorio si scan_result.amount es null — validar antes de llamar.
Future<TransactionResponse> createTransactionFromScan(
  TransactionFromScanRequest request,
) async {
  final response = await dio.post(
    '/finance/transactions/from-scan',
    data: request.toJson(),
  );
  return TransactionResponse.fromJson(response.data);
}
```

---

### 7. Pantalla de scan → transacción (flujo de 2 pasos)

El flujo de scan ya existe en la app (llama `POST /invoices/scan`). Hay que agregar un
segundo paso: después de ver los datos extraídos, el usuario puede registrarlos como
transacción financiera.

**Paso 1 — ya existe:** el usuario sube la imagen y ve los campos extraídos por GPT-4o.

**Paso 2 — construir:** después del scan, mostrar un panel de "Registrar como transacción":

```
Panel de registro de transacción
  │
  ├─ Mostrar campos del scan (pre-completados, editables):
  │   ├─ Monto (si scan lo encontró, pre-completar; si no, campo requerido con foco)
  │   ├─ Moneda (pre-completar o "USD")
  │   ├─ Fecha (pre-completar con due_date del scan o fecha de hoy)
  │   └─ Descripción (pre-completar o campo vacío)
  │
  ├─ Selector Tipo: [Ingreso] [Egreso]   (toggle / SegmentedButton)
  │
  ├─ Selector Categoría: dropdown con GET /finance/categories?type=income|expense
  │   (filtrar según el tipo seleccionado)
  │
  └─ Botón "Registrar transacción"
       ├─ Validar: si amount es null en scan Y no fue ingresado → mostrar error inline
       ├─ Llamar POST /finance/transactions/from-scan
       └─ Success: SnackBar "Transacción registrada" + navegar al Finance Dashboard
```

**Manejo del caso sin monto:**
El único campo que puede causar un 422 es `amount`. Si `scanResult.amount == null` y el
usuario no ingresó un monto manualmente, mostrar el campo como requerido con error visible
antes de llamar al backend — no esperar a que el backend rechace.

---

## Referencia rápida de errores por endpoint

### `POST /invoices/emit`

| Status                | `detail`                    | Qué mostrar al usuario                                        |
| --------------------- | --------------------------- | ------------------------------------------------------------- |
| `403`                 | `"free_plan_limit_reached"` | "Alcanzaste el límite de facturas activas del plan gratuito." |
| `404`                 | `"Client not found"`        | "El cliente seleccionado no existe."                          |
| `400`                 | items vacío                 | (prevenir en frontend con validación)                         |
| `201` + `sent: false` | —                           | "Factura creada, pero el email no llegó."                     |

### `GET /invoices/{id}/pdf`

| Status | `detail`                        | Qué mostrar al usuario                    |
| ------ | ------------------------------- | ----------------------------------------- |
| `400`  | `"Esta factura no tiene ítems"` | Ocultar el botón de PDF para esta factura |
| `404`  | `"Invoice not found"`           | Toast de error genérico                   |

### `POST /finance/transactions/from-scan`

| Status | `detail`                  | Qué mostrar al usuario                 |
| ------ | ------------------------- | -------------------------------------- |
| `422`  | `"amount is required..."` | Mostrar campo de monto como requerido  |
| `404`  | `"Category not found"`    | "La categoría seleccionada no existe." |
