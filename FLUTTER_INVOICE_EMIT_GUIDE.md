# PayRemind — Invoice Emit & Finance Integration Guide (Flutter)

> Guía para el agente **antigravity** sobre los nuevos endpoints de emisión de facturas
> con PDF y creación de transacciones financieras desde scan.

---

## Resumen de cambios

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/invoices/emit` | `POST` | Bearer | Crea factura con ítems, genera PDF, lo envía al cliente |
| `/invoices/{id}/pdf` | `GET` | Bearer | Descarga el PDF de una factura emitida |
| `/finance/transactions/from-scan` | `POST` | Bearer | Crea transacción financiera desde un scan |

**Cambio en endpoint existente:**
- `POST /invoices/` — el campo `invoice_number` ahora es **opcional**. Si no se envía, el backend lo auto-asigna (`INV-0001`, `INV-0002`…).

---

## 1. Emitir factura con PDF

### `POST /invoices/emit`

Crea la factura desde ítems de línea, calcula el total, genera el PDF y lo envía al email
del cliente. Los recordatorios automáticos comienzan desde el día siguiente sin ninguna
acción adicional.

#### Request body

```json
{
  "client_id": "uuid-del-cliente",
  "items": [
    {
      "description": "Diseño de landing page",
      "quantity": 1.0,
      "unit_price": 800.00
    },
    {
      "description": "Revisiones adicionales",
      "quantity": 3.0,
      "unit_price": 50.00
    }
  ],
  "currency": "USD",
  "due_date": "2026-07-05",
  "notes": "Pago mediante transferencia bancaria. Gracias.",
  "issued_date": "2026-06-05"
}
```

Campos:
| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `client_id` | `string` | ✅ | UUID del cliente existente |
| `items` | `list` | ✅ | Mínimo 1 ítem |
| `items[].description` | `string` | ✅ | Descripción del servicio |
| `items[].quantity` | `float` | ✅ | Cantidad (horas, unidades, etc.) |
| `items[].unit_price` | `float` | ✅ | Precio por unidad |
| `currency` | `string` | No | Default `"USD"` |
| `due_date` | `string` | ✅ | Fecha de vencimiento `YYYY-MM-DD` |
| `notes` | `string` | No | Notas al pie del PDF |
| `issued_date` | `string` | No | Default: hoy |

#### Response 201

```json
{
  "id": "uuid-factura",
  "user_id": "uuid-usuario",
  "client_id": "uuid-cliente",
  "invoice_number": "INV-0003",
  "amount": "950.00",
  "currency": "USD",
  "due_date": "2026-07-05",
  "status": "pending",
  "description": "Pago mediante transferencia bancaria. Gracias.",
  "reminder_config": {"intervals": [3, 7, 14], "active": true},
  "items": [
    {"description": "Diseño de landing page", "quantity": 1.0, "unit_price": 800.0, "total": 800.0},
    {"description": "Revisiones adicionales", "quantity": 3.0, "unit_price": 50.0, "total": 150.0}
  ],
  "issued_date": "2026-06-05",
  "sent_at": "2026-06-05T14:32:00Z",
  "created_at": "2026-06-05T14:32:00Z",
  "client": { ... },
  "email_logs": [],
  "sent": true,
  "total": 950.0
}
```

Campos clave de la respuesta:
- `invoice_number` — asignado automáticamente, formato `INV-NNNN`
- `amount` — string numérico (total), parsear con `double.parse()`
- `total` — float con el mismo valor que `amount`
- `sent` — `true` si el email llegó al cliente; `false` si hubo error de envío (la factura se creó igual)
- `sent_at` — `null` si `sent: false`
- `items[].total` — calculado por el backend (`quantity × unit_price`)

#### Errores
| Status | detail | Causa |
|---|---|---|
| `400` | `"items vacío"` | Lista de ítems vacía |
| `403` | `"free_plan_limit_reached"` | Plan free con 3 facturas activas |
| `404` | `"Client not found"` | `client_id` inválido o no pertenece al usuario |
| `502` | (no aplica) | El email falla pero la factura se crea; ver campo `sent` |

---

### Modelos Dart

```dart
class InvoiceItem {
  final String description;
  final double quantity;
  final double unitPrice;
  final double? total;

  InvoiceItem({
    required this.description,
    required this.quantity,
    required this.unitPrice,
    this.total,
  });

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

class InvoiceEmitRequest {
  final String clientId;
  final List<InvoiceItem> items;
  final String currency;
  final String dueDate;       // YYYY-MM-DD
  final String? notes;
  final String? issuedDate;   // YYYY-MM-DD, null = hoy

  InvoiceEmitRequest({
    required this.clientId,
    required this.items,
    this.currency = 'USD',
    required this.dueDate,
    this.notes,
    this.issuedDate,
  });

  Map<String, dynamic> toJson() => {
    'client_id': clientId,
    'items': items.map((i) => i.toJson()).toList(),
    'currency': currency,
    'due_date': dueDate,
    if (notes != null) 'notes': notes,
    if (issuedDate != null) 'issued_date': issuedDate,
  };
}

class InvoiceEmitResponse {
  final String id;
  final String invoiceNumber;
  final double amount;
  final double total;
  final String currency;
  final String status;
  final String dueDate;
  final String? issuedDate;
  final String? sentAt;
  final bool sent;
  final List<InvoiceItem> items;
  // + client, email_logs, reminder_config...

  InvoiceEmitResponse({
    required this.id,
    required this.invoiceNumber,
    required this.amount,
    required this.total,
    required this.currency,
    required this.status,
    required this.dueDate,
    this.issuedDate,
    this.sentAt,
    required this.sent,
    required this.items,
  });

  factory InvoiceEmitResponse.fromJson(Map<String, dynamic> json) =>
      InvoiceEmitResponse(
        id: json['id'],
        invoiceNumber: json['invoice_number'],
        amount: double.parse(json['amount'].toString()),
        total: (json['total'] as num).toDouble(),
        currency: json['currency'],
        status: json['status'],
        dueDate: json['due_date'],
        issuedDate: json['issued_date'],
        sentAt: json['sent_at'],
        sent: json['sent'] ?? true,
        items: (json['items'] as List)
            .map((i) => InvoiceItem.fromJson(i))
            .toList(),
      );

  bool get emailDelivered => sent && sentAt != null;
}
```

### Service Dart — emit

```dart
class InvoiceEmitService {
  final Dio _dio;

  InvoiceEmitService(this._dio);

  Future<InvoiceEmitResponse> emitInvoice(InvoiceEmitRequest request) async {
    final response = await _dio.post(
      '/invoices/emit',
      data: request.toJson(),
    );
    return InvoiceEmitResponse.fromJson(response.data);
  }
}
```

---

## 2. Descargar PDF de factura

### `GET /invoices/{id}/pdf`

Regenera y descarga el PDF de una factura emitida (que tenga ítems). Retorna bytes del
archivo PDF directamente.

```dart
class InvoicePdfService {
  final Dio _dio;

  InvoicePdfService(this._dio);

  /// Descarga el PDF y lo guarda en el directorio temporal del dispositivo.
  /// Retorna la ruta del archivo guardado.
  Future<String> downloadPdf(String invoiceId, String invoiceNumber) async {
    final response = await _dio.get(
      '/invoices/$invoiceId/pdf',
      options: Options(responseType: ResponseType.bytes),
    );

    final dir = await getTemporaryDirectory();
    final filePath = '${dir.path}/factura-$invoiceNumber.pdf';
    final file = File(filePath);
    await file.writeAsBytes(response.data);
    return filePath;
  }

  /// Abre el PDF en el visor nativo del dispositivo.
  Future<void> openPdf(String invoiceId, String invoiceNumber) async {
    final path = await downloadPdf(invoiceId, invoiceNumber);
    await OpenFile.open(path);
  }
}
```

> **Dependencias necesarias:** `path_provider`, `open_file`

#### Errores
| Status | detail | Causa |
|---|---|---|
| `400` | `"Esta factura no tiene ítems"` | Factura creada manualmente (sin PDF) |
| `403` | `"Not allowed"` | Factura de otro usuario |
| `404` | `"Invoice not found"` | ID inválido |

---

## 3. Transacción financiera desde scan

### Flujo completo

```
1. POST /invoices/scan      → InvoiceScanResult
2. Usuario revisa datos     → puede override campos
3. POST /finance/transactions/from-scan  → TransactionResponse
```

### `POST /finance/transactions/from-scan`

#### Request body

```json
{
  "scan_result": {
    "invoice_number": "FAC-2026-001",
    "amount": 1200.00,
    "currency": "USD",
    "due_date": "2026-06-30",
    "client_name": "Empresa ABC",
    "client_email": "pagos@empresa.com",
    "description": "Servicios de desarrollo web",
    "confidence": 0.92,
    "raw_text": "...",
    "warnings": []
  },
  "type": "income",
  "category_id": "uuid-categoria-pago-de-factura",
  "date": null,
  "description": null,
  "amount": null,
  "currency": null
}
```

Resolución de campos (orden de prioridad):
| Campo | Override → Scan → Fallback |
|---|---|
| `amount` | `data.amount` → `scan_result.amount` → **422 si ninguno** |
| `currency` | `data.currency` → `scan_result.currency` → `"USD"` |
| `date` | `data.date` → `scan_result.due_date` → `hoy` |
| `description` | `data.description` → `scan_result.description` → `"Transacción"` |

#### Response 201

```json
{
  "id": "uuid-transaccion",
  "type": "income",
  "amount": "1200.00",
  "currency": "USD",
  "description": "Servicios de desarrollo web",
  "date": "2026-06-30",
  "is_automatic": false,
  "created_at": "2026-06-05T15:00:00Z",
  "invoice_id": null,
  "category": {
    "id": "uuid",
    "name": "Pago de factura",
    "type": "income",
    "icon": "receipt",
    "color": "#22C55E",
    "is_default": true
  }
}
```

#### Errores
| Status | detail | Causa |
|---|---|---|
| `422` | `"amount is required..."` | No hay monto ni en el request ni en el scan |
| `404` | `"Category not found"` | `category_id` inválido |

---

### Modelos Dart

```dart
class TransactionFromScanRequest {
  final InvoiceScanResult scanResult;
  final String type;         // "income" | "expense"
  final String categoryId;
  final String? date;        // YYYY-MM-DD, null = usa scan o hoy
  final String? description;
  final double? amount;
  final String? currency;

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

> `InvoiceScanResult` necesita un método `toJson()`. Si no lo tenés, agregarlo:
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

### Service Dart — from-scan

```dart
class FinanceScanService {
  final Dio _dio;

  FinanceScanService(this._dio);

  Future<TransactionResponse> createFromScan(
    TransactionFromScanRequest request,
  ) async {
    final response = await _dio.post(
      '/finance/transactions/from-scan',
      data: request.toJson(),
    );
    return TransactionResponse.fromJson(response.data);
  }
}
```

---

## 4. UX flows sugeridos

### Flow: Emitir factura

```
InvoiceFormScreen
  ├─ AddItemsWidget (lista dinámica de ítems)
  │   └─ Muestra subtotal en tiempo real (calcular en frontend)
  ├─ ClientPickerWidget
  ├─ DueDatePicker
  ├─ NotesField (opcional)
  └─ EmitButton
       ├─ Loading: "Generando factura..."
       ├─ Success (sent: true):
       │   └─ SnackBar: "Factura INV-0003 enviada a cliente@email.com"
       │   └─ Navegar a InvoiceDetailScreen
       └─ Partial success (sent: false):
           └─ Dialog: "Factura creada pero el email no se pudo enviar.
                        Podés reenviarla manualmente desde el detalle."
```

### Flow: Scan → Transacción

```
InvoiceScanScreen
  ├─ Subir imagen → POST /invoices/scan
  ├─ Mostrar campos extraídos con confianza
  ├─ Usuario puede editar campos antes de registrar
  ├─ Seleccionar tipo (Ingreso / Egreso)
  ├─ Seleccionar categoría (GET /finance/categories)
  └─ RegistrarButton → POST /finance/transactions/from-scan
       ├─ Si amount == null en scan Y no hay override:
       │   Mostrar campo de monto obligatorio antes de continuar
       └─ Success: navegar a TransactionDetailScreen o Finance Dashboard
```

---

## 5. Cambio en `POST /invoices/` existente

El campo `invoice_number` ahora es **opcional**. Si no se envía, el backend asigna
`INV-NNNN` automáticamente.

```dart
// ANTES (requería invoice_number):
final body = {
  'client_id': clientId,
  'invoice_number': 'FAC-001',  // ya no es necesario
  'amount': 500.00,
  'due_date': '2026-07-01',
};

// AHORA (sin invoice_number → se auto-asigna):
final body = {
  'client_id': clientId,
  'amount': 500.00,
  'due_date': '2026-07-01',
};
```

---

## 6. Configuración del cliente Dio

Sin cambios. Los nuevos endpoints usan el mismo cliente con Bearer token y base URL existente.

```dart
// GET /{id}/pdf — requiere responseType: bytes
final pdfResponse = await dio.get(
  '/invoices/$id/pdf',
  options: Options(responseType: ResponseType.bytes),
);
```
