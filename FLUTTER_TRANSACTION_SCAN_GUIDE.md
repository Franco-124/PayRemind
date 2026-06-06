# PayRemind — Guía de actualización: Transaction Scan

> **Para el agente Claude Code.**
> Esta guía describe exactamente qué eliminar, qué actualizar y qué construir en el
> proyecto Flutter. Leé todo antes de tocar código — hay eliminaciones importantes.

---

## Contexto: qué cambió y por qué

El módulo de facturas ya no tiene un flujo de "registrar factura desde imagen". Las
facturas ahora se **crean desde cero** en PayRemind con `POST /invoices/emit`. Registrar
una factura externa dejó de tener sentido.

Lo que sí tiene valor es registrar **gastos e ingresos rápidos** desde un comprobante
físico (ticket del restaurant, recibo de suscripción, comprobante de transferencia).
Ese flujo ahora vive en el módulo de **finanzas/transacciones**, no en facturas.

**Endpoints eliminados del backend — si el proyecto los llama, van a recibir 404:**
- `POST /invoices/scan` — eliminado
- `POST /finance/transactions/from-scan` — eliminado

**Endpoint nuevo:**
- `POST /finance/transactions/scan` — recibe `category_id` + imagen, extrae los campos
  relevantes para esa categoría específica y retorna datos para pre-llenar el formulario.

---

## PASO 1 — Eliminar el flujo de "trackear factura desde imagen"

Esto es lo más importante. El flujo de escanear una factura para registrarla en el módulo
de facturas **ya no tiene lugar en la app**. Hay que eliminarlo completamente.

### Qué buscar y borrar

Buscá en el proyecto todas las referencias a estas strings y eliminá los archivos/widgets
asociados:

```
/invoices/scan
InvoiceScanResult
invoice_scan_service
InvoiceScanScreen  (o el nombre que tenga la pantalla de scan de facturas)
TransactionFromScanRequest
/finance/transactions/from-scan
```

**Lista de lo que probablemente existe y hay que eliminar:**

| Qué | Dónde buscar |
|---|---|
| Llamada a `POST /invoices/scan` | Servicio de facturas o scan service |
| Modelo `InvoiceScanResult` | `lib/models/` o similar |
| Servicio `InvoiceScanService` (el viejo) | `lib/services/` |
| Pantalla de scan de facturas | `lib/screens/` o `lib/pages/` |
| Llamada a `POST /finance/transactions/from-scan` | Donde sea que estuviera |
| Modelo `TransactionFromScanRequest` | `lib/models/` o similar |
| Botón/acceso desde el módulo de facturas al scan | Pantalla de facturas |

**Si hay navegación desde la pantalla de facturas hacia el scan de facturas, eliminar
ese punto de entrada también.** El módulo de facturas ya no tiene scan.

---

## PASO 2 — Actualizar modelos existentes

### `Category` — nuevo campo `scanFields`

```dart
// Agregar al modelo Category existente:
final List<String>? scanFields;

// En el constructor:
this.scanFields,

// En fromJson:
scanFields: (json['scan_fields'] as List?)
    ?.map((e) => e.toString())
    .toList(),
```

### `Transaction` — nuevo campo `extraData`

```dart
// Agregar al modelo Transaction existente:
final Map<String, dynamic>? extraData;

// En el constructor:
this.extraData,

// En fromJson:
extraData: json['extra_data'] != null
    ? Map<String, dynamic>.from(json['extra_data'])
    : null,
```

### Request de crear transacción — nuevo campo `extraData`

En el modelo o mapa que se usa para `POST /finance/transactions`, agregar el campo
opcional `extra_data`:

```dart
// En el toJson() o body del request:
if (extraData != null && extraData!.isNotEmpty) 'extra_data': extraData,
```

---

## PASO 3 — Construir el nuevo flujo en Finanzas/Transacciones

El scan ahora vive en la sección de **Finanzas → Nueva Transacción**. El usuario puede
registrar un gasto o ingreso en dos modos:

- **Modo manual**: llena los campos a mano
- **Modo scan**: sube una foto del comprobante y los campos se pre-llenan automáticamente

### 3.1 Modelo `TransactionScanResult`

```dart
class TransactionScanResult {
  final double? amount;
  final String? currency;
  final String? date;                       // YYYY-MM-DD
  final String? description;
  final Map<String, dynamic> extraData;     // campos extras según la categoría
  final double confidence;                  // 0.0 a 1.0
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
        amount: json['amount'] != null
            ? (json['amount'] as num).toDouble()
            : null,
        currency: json['currency'],
        date: json['date'],
        description: json['description'],
        extraData: json['extra_data'] != null
            ? Map<String, dynamic>.from(json['extra_data'])
            : {},
        confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
        warnings: (json['warnings'] as List?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
      );

  bool get hasUsableData => amount != null || date != null;

  String get confidenceLabel {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.5) return 'Media';
    return 'Baja';
  }
}
```

### 3.2 Servicio de scan

```dart
class TransactionScanService {
  final Dio _dio;

  TransactionScanService(this._dio);

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

### 3.3 Pantalla `NewTransactionScreen`

Esta pantalla reemplaza o extiende la pantalla existente de nueva transacción. Si ya
existe una pantalla para crear transacciones manualmente, agregar el modo scan como
opción adicional dentro de ella — no crear una pantalla separada.

**Estructura de la pantalla:**

```
NewTransactionScreen
  │
  ├─ Selector de tipo: [Ingreso] [Egreso]
  │   (SegmentedButton o toggle — filtra las categorías)
  │
  ├─ Selector de categoría
  │   GET /finance/categories?type=income|expense
  │   Mostrar con ícono y color de cada categoría
  │
  ├─ Botón "Escanear comprobante" (opcional)
  │   Solo visible si category != null
  │   Abre selector: [Cámara] [Galería]
  │      → POST /finance/transactions/scan {file, category_id}
  │      → Loading: "Analizando comprobante..."
  │      → Pre-llena todos los campos del formulario
  │
  ├─ Formulario (editable siempre, pre-llenado si hubo scan):
  │   ├─ Monto *          ← scan.amount
  │   ├─ Moneda           ← scan.currency (default "USD")
  │   ├─ Fecha *          ← scan.date (datepicker, default hoy)
  │   ├─ Descripción      ← scan.description
  │   └─ Campos extras    ← scan.extraData (uno por campo, ver sección 3.4)
  │
  ├─ Banner de confianza (si hubo scan):
  │   confidence >= 0.8 → nada
  │   confidence >= 0.5 → banner amarillo: "Revisá los datos — confianza media"
  │   confidence < 0.5  → banner naranja: "No se encontraron todos los datos.
  │                        Completá los campos manualmente."
  │
  └─ Botón "Guardar"
      POST /finance/transactions {
        category_id, type, amount, currency, date, description,
        extra_data: { ...camposExtrasEditados }
      }
      → Success: navegar al dashboard de finanzas o lista de transacciones
```

### 3.4 Renderizar campos extras dinámicos

Los campos extras dependen de la categoría. Usar este mapa de labels:

```dart
const Map<String, String> _fieldLabels = {
  'vendor_name':      'Negocio / Local',
  'provider_name':    'Proveedor',
  'service_name':     'Servicio',
  'tool_name':        'Herramienta',
  'client_name':      'Cliente',
  'invoice_number':   'N° de factura',
  'project_name':     'Proyecto',
  'product_name':     'Producto',
  'instrument_name':  'Instrumento',
  'destination':      'Destino',
  'billing_period':   'Período de facturación',
  'institution_name': 'Institución',
  'course_name':      'Curso',
  'concept':          'Concepto',
  'venue_name':       'Lugar',
};
```

Hay dos momentos donde mostrar estos campos:

**A) Después del scan** — mostrar solo los que GPT encontró (vienen en `extraData`):
```dart
// extraData puede tener: {"vendor_name": "McDonald's"}
for (final entry in scanResult.extraData.entries)
  TextFormField(
    initialValue: entry.value?.toString() ?? '',
    decoration: InputDecoration(
      labelText: _fieldLabels[entry.key] ?? entry.key,
    ),
    onChanged: (val) => _editedExtraData[entry.key] = val,
  ),
```

**B) Sin scan** — si la categoría tiene `scanFields`, mostrar esos campos vacíos para
que el usuario los llene manualmente si quiere:
```dart
// category.scanFields puede tener: ["vendor_name"]
if (selectedCategory != null)
  for (final field in selectedCategory!.scanFields ?? [])
    TextFormField(
      decoration: InputDecoration(
        labelText: _fieldLabels[field] ?? field,
        hintText: 'Opcional',
      ),
      onChanged: (val) {
        if (val.isNotEmpty) _manualExtraData[field] = val;
      },
    ),
```

---

## PASO 4 — Punto de entrada en la app

Agregar acceso a "Nueva Transacción" desde la sección de finanzas. El flujo debe sentirse
como registrar un gasto o ingreso simple, no como "escanear una factura".

**Sugerencia de UX en la pantalla de finanzas/dashboard:**

```
FinanceDashboardScreen
  │
  ├─ FAB o botón "+" → NewTransactionScreen
  │
  └─ Lista de transacciones recientes
       └─ Cada item muestra: categoría (ícono+color), monto, fecha, descripción
          Si tiene extraData → mostrar el campo más relevante como subtítulo
          (ej: para Alimentación → vendor_name: "McDonald's")
```

**Si existe una pantalla de "Historial de Transacciones", actualizar para:**
- Mostrar el badge del tipo (Ingreso / Egreso) con color
- Mostrar `extraData` resumido debajo de la descripción cuando existe

---

## Referencia rápida de errores

### `POST /finance/transactions/scan`
| Status | `detail` | Qué mostrar |
|---|---|---|
| `400` | `"Formato no soportado..."` | "Solo se aceptan imágenes JPG o PNG" |
| `400` | `"El archivo está vacío."` | "La imagen no se pudo leer. Intentá de nuevo." |
| `400` | `"La imagen es demasiado grande."` | "La imagen supera 10 MB. Usá una de menor tamaño." |
| `404` | `"Category not found"` | No debería ocurrir si `category_id` viene del listado |
| `200` + `confidence: 0.0` | — | Mostrar formulario vacío con mensaje: "No se pudo leer el comprobante. Completá los datos manualmente." |

---

## `scan_fields` por categoría (referencia)

Retornados en `GET /finance/categories` → campo `scan_fields` de cada categoría.

| Categoría | Tipo | Campos extras |
|---|---|---|
| Pago de factura | Ingreso | `client_name`, `invoice_number` |
| Proyecto freelance | Ingreso | `client_name`, `project_name` |
| Consultoría | Ingreso | `client_name` |
| Productos digitales | Ingreso | `product_name` |
| Inversiones | Ingreso | `instrument_name` |
| Otros ingresos | Ingreso | — |
| Alimentación | Gasto | `vendor_name` |
| Transporte | Gasto | `provider_name`, `destination` |
| Servicios | Gasto | `provider_name` |
| Suscripciones | Gasto | `service_name`, `billing_period` |
| Software y tools | Gasto | `tool_name`, `billing_period` |
| Marketing | Gasto | `vendor_name` |
| Educación | Gasto | `institution_name`, `course_name` |
| Salud | Gasto | `provider_name` |
| Vivienda | Gasto | `concept` |
| Entretenimiento | Gasto | `venue_name` |
| Otros gastos | Gasto | — |
