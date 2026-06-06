# PayRemind — Guía de actualización: Transaction Scan

> **Para el agente Claude Code.**
> Esta guía describe los cambios en el backend y exactamente qué actualizar/construir
> en el proyecto Flutter.

---

## Contexto: qué cambió y por qué

El sistema de scan anterior tenía dos endpoints separados (`POST /invoices/scan` y
`POST /finance/transactions/from-scan`) que no tenían sentido juntos: el primero extraía
datos de "facturas" (número, cliente, email) que son irrelevantes para registrar un gasto
rápido del día a día.

**Lo que se eliminó del backend:**
- `POST /invoices/scan` — **ya no existe**. Si el proyecto Flutter lo llama, va a recibir 404.
- `POST /finance/transactions/from-scan` — **ya no existe**.

**Lo que se agregó:**
- `POST /finance/transactions/scan` — un único endpoint que recibe `category_id` + imagen
  y extrae exactamente los campos relevantes para esa categoría. GPT sabe qué buscar según
  el tipo de gasto (para "Alimentación" busca el nombre del negocio; para "Suscripciones"
  busca el nombre del servicio y el período de facturación; etc.).
- `extra_data` en transacciones — campo JSONB para guardar los campos extras extraídos.
- `scan_fields` en categorías — el backend ahora retorna qué campos extra tiene cada categoría.

---

## Cambios que impactan código Flutter existente

### ⚠️ Eliminar toda referencia a `POST /invoices/scan`

Buscá en el proyecto cualquier llamada a `/invoices/scan` y eliminala junto con su
servicio, modelo y pantalla asociada. Ese endpoint fue removido del backend.

### ⚠️ Eliminar toda referencia a `POST /finance/transactions/from-scan`

Mismo caso. Buscar y eliminar cualquier llamada a `/finance/transactions/from-scan`,
el modelo `TransactionFromScanRequest`, y `InvoiceScanResult` si solo se usaba para eso.

### ⚠️ `CategoryResponse` ahora incluye `scan_fields`

El backend retorna un campo nuevo en cada categoría. Actualizar el modelo `Category` en
Dart para incluirlo:

```dart
// Agregar al modelo Category existente:
final List<String>? scanFields;   // campos extras que GPT extrae para esta categoría

// En fromJson:
scanFields: (json['scan_fields'] as List?)?.map((e) => e.toString()).toList(),
```

### ⚠️ `TransactionResponse` ahora incluye `extra_data`

```dart
// Agregar al modelo Transaction existente:
final Map<String, dynamic>? extraData;

// En fromJson:
extraData: json['extra_data'] != null
    ? Map<String, dynamic>.from(json['extra_data'])
    : null,
```

### ⚠️ `POST /finance/transactions` ahora acepta `extra_data`

Cuando se crea una transacción después de un scan, incluir los campos extras confirmados:

```dart
// En el toJson() del request de creación de transacción, agregar:
if (extraData != null && extraData!.isNotEmpty) 'extra_data': extraData,
```

---

## Lo que tenés que construir

### 1. Servicio de scan de transacciones

Reemplazá el servicio de scan anterior con este. Usa `multipart/form-data` con dos campos:
`file` (la imagen) y `category_id` (form field de texto).

```dart
class TransactionScanService {
  final Dio _dio;

  TransactionScanService(this._dio);

  /// Sube una imagen y extrae los campos de la transacción según la categoría.
  /// Retorna TransactionScanResult con los datos pre-extraídos para el formulario.
  Future<TransactionScanResult> scanReceipt({
    required String categoryId,
    required File imageFile,
  }) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        imageFile.path,
        filename: imageFile.path.split('/').last,
        contentType: DioMediaType('image', 'jpeg'),
      ),
      'category_id': categoryId,
    });

    final response = await _dio.post(
      '/finance/transactions/scan',
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        sendTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    return TransactionScanResult.fromJson(response.data);
  }
}
```

### 2. Modelo `TransactionScanResult`

```dart
class TransactionScanResult {
  final double? amount;
  final String? currency;
  final String? date;            // YYYY-MM-DD
  final String? description;
  final Map<String, dynamic> extraData;   // campos extras de la categoría
  final double confidence;
  final List<String> warnings;

  TransactionScanResult({
    this.amount,
    this.currency,
    this.date,
    this.description,
    this.extraData = const {},
    this.confidence = 0.0,
    this.warnings = const [],
  });

  factory TransactionScanResult.fromJson(Map<String, dynamic> json) =>
      TransactionScanResult(
        amount: json['amount'] != null ? (json['amount'] as num).toDouble() : null,
        currency: json['currency'],
        date: json['date'],
        description: json['description'],
        extraData: json['extra_data'] != null
            ? Map<String, dynamic>.from(json['extra_data'])
            : {},
        confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
        warnings: (json['warnings'] as List?)?.map((e) => e.toString()).toList() ?? [],
      );

  bool get hasUsableData => amount != null || date != null;
  String get confidenceLabel {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.5) return 'Media';
    return 'Baja';
  }
}
```

### 3. Flujo de nueva transacción con scan

El flujo completo de "Nueva transacción con comprobante":

```
NewTransactionScreen
  │
  ├─ 1. Usuario selecciona categoría
  │      GET /finance/categories retorna categorías con scan_fields
  │
  ├─ 2. Si la categoría tiene scan_fields o el usuario quiere subir comprobante:
  │      Mostrar botón "Escanear comprobante"
  │
  ├─ 3. Usuario sube imagen (cámara o galería)
  │      POST /finance/transactions/scan  {file, category_id}
  │      Mostrar loading: "Analizando comprobante..."
  │
  ├─ 4. Mostrar formulario PRE-LLENADO con los datos del scan:
  │      ├─ Monto        ← scan.amount (editable)
  │      ├─ Moneda       ← scan.currency (editable)
  │      ├─ Fecha        ← scan.date (editable, datepicker)
  │      ├─ Descripción  ← scan.description (editable)
  │      └─ Campos extra ← scan.extraData (editable, uno por campo)
  │
  │      Si confidence < 0.5: mostrar banner amarillo
  │        "Confianza baja — revisá los datos antes de guardar"
  │      Si warnings no está vacío: listar qué campos no se encontraron
  │
  ├─ 5. Usuario confirma / edita los campos
  │
  └─ 6. POST /finance/transactions {
           category_id, type, amount, currency, date, description,
           extra_data: { ...camposEditados }
         }
```

### 4. Cómo renderizar los campos extras en el formulario

Los campos extras del scan son dinámicos — dependen de la categoría. Usar un mapa de
labels legibles por campo:

```dart
const Map<String, String> _fieldLabels = {
  'vendor_name':       'Negocio / Local',
  'provider_name':     'Proveedor',
  'service_name':      'Servicio',
  'tool_name':         'Herramienta',
  'client_name':       'Cliente',
  'invoice_number':    'N° de factura',
  'project_name':      'Proyecto',
  'product_name':      'Producto',
  'instrument_name':   'Instrumento',
  'destination':       'Destino',
  'billing_period':    'Período de facturación',
  'institution_name':  'Institución',
  'course_name':       'Curso',
  'concept':           'Concepto',
  'venue_name':        'Lugar',
};

// Renderizar dinámicamente los campos extras:
for (final entry in scanResult.extraData.entries)
  TextFormField(
    initialValue: entry.value?.toString() ?? '',
    decoration: InputDecoration(
      labelText: _fieldLabels[entry.key] ?? entry.key,
    ),
    onChanged: (val) => editedExtraData[entry.key] = val,
  ),
```

---

## Referencia rápida de errores

### `POST /finance/transactions/scan`
| Status | `detail` | Qué hacer |
|---|---|---|
| `400` | `"Formato no soportado..."` | Validar JPG/PNG antes de subir |
| `400` | `"El archivo está vacío."` | Reintentar con otra imagen |
| `400` | `"La imagen es demasiado grande."` | Comprimir imagen antes de subir |
| `404` | `"Category not found"` | Verificar que `category_id` es válido |
| `200` + `confidence: 0.0` | — | Imagen ilegible — mostrar campos vacíos para llenar manualmente |

---

## `scan_fields` por categoría (referencia)

Estos son los campos extras que cada categoría extrae. El backend los retorna en
`GET /finance/categories` → campo `scan_fields`:

| Categoría | scan_fields |
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
