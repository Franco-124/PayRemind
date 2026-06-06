# PayRemind — Contexto completo de la aplicación

> Documento de referencia para cualquier agente o desarrollador que trabaje en este proyecto.
> Refleja el estado del codebase al 2026-06-05.

---

## Qué es PayRemind

SaaS para freelancers que centraliza la gestión de facturas y finanzas personales.
Las dos funciones core son:

1. **Recordatorios de cobro automáticos** — cuando una factura vence, el sistema envía
   emails al cliente con tono que escala según los días de retraso (amigable → firme → final).
   Los emails son generados por GPT-4o-mini con el estilo configurado por el freelancer.

2. **Módulo de finanzas** — registro de ingresos y egresos con categorías, escaneo de
   comprobantes por imagen (GPT-4o Vision), dashboard mensual con balance, y presupuestos
   por categoría.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend API | FastAPI (Python 3.11), SQLAlchemy 2.0, APScheduler |
| Base de datos | PostgreSQL (JSONB para campos flexibles) |
| Migraciones | Alembic |
| Email | Resend API |
| AI — emails | OpenAI GPT-4o-mini |
| AI — scan | OpenAI GPT-4o Vision |
| PDF | fpdf2 (Python puro, sin dependencias de sistema) |
| Billing | Lemon Squeezy (webhooks para upgrade/downgrade) |
| Frontend web | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Deploy backend | Railway (auto-deploy desde `git push origin main`) |
| Deploy frontend | Vercel |

---

## Estructura del monorepo

```
payremind/
├── app/                         # Next.js App Router (frontend)
│   ├── (dashboard)/             # Rutas autenticadas
│   │   ├── dashboard/           # Vista principal
│   │   ├── clients/             # Gestión de clientes
│   │   ├── invoices/            # Gestión de facturas
│   │   ├── emails/              # Historial de emails
│   │   ├── feedback/            # Feedback de usuarios
│   │   ├── settings/            # Configuración de cuenta
│   │   └── admin/               # Panel de admin (solo admin_email)
│   ├── login/ register/         # Auth pages
│   ├── components/ui/           # Componentes reutilizables
│   ├── contexts/                # React Contexts (language)
│   ├── hooks/                   # Custom hooks
│   └── lib/                     # Utilidades y API client
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + APScheduler lifespan
│   │   ├── config.py            # Settings (pydantic-settings, .env)
│   │   ├── database.py          # SQLAlchemy engine + SessionLocal
│   │   ├── models/              # ORM models
│   │   ├── schemas/             # Pydantic schemas (request/response)
│   │   ├── routers/             # FastAPI routers (HTTP layer)
│   │   ├── services/            # Lógica de negocio
│   │   ├── scheduler/           # APScheduler jobs
│   │   ├── templates/           # Templates de email HTML
│   │   └── data/                # Seed data (categorías por defecto)
│   ├── alembic/                 # Migraciones de DB
│   └── requirements.txt
└── CLAUDE.md
```

---

## Variables de entorno (backend)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key |
| `RESEND_API_KEY` | API key de Resend para emails |
| `OPENAI_API_KEY` | API key de OpenAI (GPT-4o-mini + GPT-4o Vision) |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Firma HMAC de webhooks |
| `LEMON_SQUEEZY_API_KEY` | API key para Lemon Squeezy |
| `LEMON_SQUEEZY_STORE_ID` | ID del store |
| `LEMON_SQUEEZY_PRO_VARIANT_ID` | ID del variant Pro |
| `ADMIN_EMAIL` | Email del admin (acceso a `/admin`) |
| `TRIAL_SLOTS_TOTAL` | Cuántos usuarios pueden tener trial (default: 10) |
| `TRIAL_DAYS` | Duración del trial en días (default: 30) |

---

## Modelos de base de datos

### `users`
```
id              UUID (PK)
email           String unique
hashed_password String
full_name       String
plan            ENUM('free', 'pro')      — default 'free'
lemon_squeezy_id String nullable         — ID de suscripción en LS
invoice_counter  Integer default 0       — contador atómico para INV-XXXX
is_trial        Boolean default False
trial_ends_at   DateTime nullable
created_at / updated_at
```

### `clients`
```
id              UUID (PK)
user_id         FK → users (CASCADE DELETE)
name            String
email           String
company         String nullable
notes           Text nullable
email_language  String(2) default 'es'   — 'es' | 'en'
email_tone      String default 'semi-formal'  — 'formal' | 'semi-formal' | 'casual'
email_treatment String default 'nombre'  — 'nombre' | 'tu' | 'usted'
sender_name     String nullable          — nombre que aparece en el email
email_instructions Text nullable         — instrucciones extra para GPT
created_at
```

### `invoices`
```
id              UUID (PK)
user_id         FK → users (CASCADE DELETE)
client_id       FK → clients (CASCADE DELETE)
invoice_number  String                   — formato 'INV-0001' (auto o manual)
amount          Numeric(10,2)
currency        String default 'USD'
due_date        Date
status          ENUM('pending','overdue','paid','cancelled') default 'pending'
description     Text nullable
reminder_config JSONB default {intervals:[3,7,14], active:true}
email_config_override JSONB nullable     — override por factura del config del cliente
items           JSONB nullable           — list[{description,quantity,unit_price,total}]
issued_date     Date nullable            — fecha de emisión (emit flow)
sent_at         DateTime nullable        — cuándo se envió el email al cliente
created_at
```

### `categories`
```
id              UUID (PK)
user_id         String nullable          — NULL = categoría global (seed), else del usuario
name            String
type            ENUM('income', 'expense')
icon            String nullable          — nombre de Material Icon
color           String nullable          — hex color
is_default      Boolean default True
scan_fields     JSONB nullable           — list[str] de campos extras para el scan GPT
created_at
```

### `transactions`
```
id              UUID (PK)
user_id         FK → users (CASCADE DELETE)
category_id     FK → categories
invoice_id      FK → invoices nullable   — presente si es automática (factura pagada)
type            ENUM('income', 'expense')
amount          Numeric(12,2)
currency        String(3) default 'USD'
description     Text nullable
date            Date
is_automatic    Boolean default False    — True si fue creada por el sistema
extra_data      JSONB nullable           — campos específicos de la categoría
created_at
```

### `budgets`
```
id              UUID (PK)
user_id         FK → users (CASCADE DELETE)
category_id     FK → categories nullable
amount          Numeric(12,2)
currency        String default 'USD'
period_type     ENUM('monthly', 'annual')
year            Integer
month           Integer nullable         — requerido si period_type = 'monthly'
created_at
```

### `email_logs`
```
id              UUID (PK)
invoice_id      FK → invoices (CASCADE DELETE)
recipient_email String
reminder_day    Integer                  — días desde vencimiento (3, 7, 14…)
tone            String                   — 'friendly' | 'firm' | 'final'
status          String                   — 'sent' | 'failed'
sent_at         DateTime
subject         Text
body            Text
error_message   Text nullable
```

---

## API — Endpoints

### Auth (`/auth`)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registro. Primeros 10 usuarios obtienen Pro trial de 30 días |
| POST | `/auth/login` | Login con email+password. Devuelve JWT Bearer |
| GET  | `/auth/me` | Perfil del usuario autenticado |

### Clients (`/clients`)
| Método | Ruta | Descripción |
|---|---|---|
| GET    | `/clients` | Listar clientes del usuario |
| POST   | `/clients` | Crear cliente |
| GET    | `/clients/{id}` | Obtener cliente |
| PUT    | `/clients/{id}` | Actualizar cliente |
| DELETE | `/clients/{id}` | Eliminar cliente (cascade elimina sus facturas) |

### Invoices (`/invoices`)
| Método | Ruta | Descripción |
|---|---|---|
| POST   | `/invoices/emit` | Crear factura con ítems → PDF → email al cliente. Retorna `{sent: bool, total: float}` |
| GET    | `/invoices/{id}/pdf` | Descargar PDF de una factura emitida |
| GET    | `/invoices` | Listar facturas (query param `invoice_status`) |
| POST   | `/invoices` | Crear factura simple (sin PDF, sin email) |
| GET    | `/invoices/{id}` | Obtener factura con logs |
| PUT    | `/invoices/{id}` | Actualizar factura |
| PATCH  | `/invoices/{id}/status` | Cambiar status. Al marcar `paid` registra transacción de ingreso automáticamente |
| DELETE | `/invoices/{id}` | Eliminar factura |
| PATCH  | `/invoices/{id}/reminders/toggle` | Activar/pausar recordatorios |
| POST   | `/invoices/{id}/send-reminder` | Enviar recordatorio inmediato (bypass de intervalos) |

### Finance (`/finance`)
| Método | Ruta | Descripción |
|---|---|---|
| GET    | `/finance/categories` | Listar categorías (query param `type=income\|expense`) |
| POST   | `/finance/transactions/scan` | Subir imagen (multipart: `file` + `category_id`). Retorna datos pre-llenados |
| GET    | `/finance/transactions` | Listar transacciones (filtros: `type`, `month`, `year`, `category_id`) |
| POST   | `/finance/transactions` | Crear transacción manualmente |
| DELETE | `/finance/transactions/{id}` | Eliminar transacción. 403 si no es del usuario |
| GET    | `/finance/budgets` | Listar presupuestos (query param `year`) |
| POST   | `/finance/budgets` | Crear presupuesto |
| DELETE | `/finance/budgets/{id}` | Eliminar presupuesto |
| GET    | `/finance/dashboard` | Dashboard financiero (query params `month`, `year`) |

### Otros
| Prefijo | Descripción |
|---|---|
| `/email-logs` | Historial de emails enviados |
| `/feedback` | Feedback de usuarios |
| `/webhooks` | Lemon Squeezy webhooks (subscription_created, cancelled, expired) |
| `/stats` | Estadísticas generales (solo admin) |

---

## Flujos de negocio clave

### Flujo 1 — Recordatorios automáticos
1. APScheduler corre `check_and_send_reminders` todos los días a las 09:00 UTC.
2. Marca como `overdue` las facturas `pending` cuyo `due_date < today`.
3. Para cada factura `pending|overdue` con `reminder_config.active=true`:
   - Si el usuario es `free`, se salta (solo Pro envía recordatorios).
   - Si `days_since_due` está en los `intervals`, y no fue enviado antes (`email_logs`):
     - Genera email con GPT-4o-mini usando el tono y estilo configurado.
     - Envía por Resend.
     - Registra en `email_logs`.

### Flujo 2 — Invoice Emit (crear factura con PDF)
1. Flutter llama `POST /invoices/emit` con `{client_id, items[], currency, due_date, notes?}`.
2. Backend asigna automáticamente `invoice_number` (ej: `INV-0042`) con UPDATE atómico.
3. Calcula totales por ítem y total general.
4. Genera PDF con `fpdf2` (branding indigo-500, tabla de ítems con filas alternadas).
5. Envía email al cliente con PDF adjunto en base64 via Resend.
6. Responde con `{invoice, sent: bool, total: float}`.

### Flujo 3 — Scan de comprobante
1. Flutter llama `POST /finance/transactions/scan` (multipart) con `file` + `category_id`.
2. Backend carga la categoría y sus `scan_fields`.
3. Construye un prompt dinámico para GPT-4o Vision: 4 campos base + campos extras.
4. Responde con `{amount?, currency?, date?, description?, extra_data, confidence, warnings}`.
5. Flutter pre-llena el formulario con estos datos (el usuario puede editar antes de guardar).
6. Usuario confirma → Flutter llama `POST /finance/transactions` con `extra_data`.

### Flujo 4 — Factura marcada como pagada
1. Flutter llama `PATCH /invoices/{id}/status` con `{status: "paid"}`.
2. Backend actualiza el status.
3. Automáticamente crea una `Transaction` de tipo `income` con:
   - `category = "Pago de factura"` (categoría global seed)
   - `is_automatic = true`
   - `invoice_id = invoice.id`
4. Esta transacción aparece en el dashboard financiero.

### Flujo 5 — Billing (Lemon Squeezy)
- Usuario compra → LS envía `subscription_created` webhook → backend setea `plan = "pro"`.
- Usuario cancela → LS envía `subscription_cancelled` → backend setea `plan = "free"`.
- Plan expirado → LS envía `subscription_expired` → `plan = "free"`.
- Trial: los primeros 10 registros en el sistema obtienen `plan = "pro"` con `is_trial = true`
  por 30 días. APScheduler revoca a `free` cuando `trial_ends_at` pasa.

---

## Planes y restricciones

| Feature | Free | Pro |
|---|---|---|
| Facturas activas (pending/overdue) | Máx. 3 | Ilimitadas |
| Recordatorios automáticos | No | Sí |
| Envío manual de recordatorios | No (bypassed) | Sí |
| Invoice Emit con PDF | Hasta límite | Ilimitadas |
| Módulo de finanzas | Sí | Sí |
| Scan de comprobantes | Sí | Sí |

---

## Categorías de finanzas (seed global)

### Ingresos
| Nombre | Icono | Color | scan_fields |
|---|---|---|---|
| Pago de factura | receipt | #22C55E | client_name, invoice_number |
| Proyecto freelance | work | #6366F1 | client_name, project_name |
| Consultoría | psychology | #8B5CF6 | client_name |
| Productos digitales | inventory_2 | #06B6D4 | product_name |
| Inversiones | trending_up | #F59E0B | instrument_name |
| Otros ingresos | add_circle | #94A3B8 | — |

### Gastos
| Nombre | Icono | Color | scan_fields |
|---|---|---|---|
| Alimentación | restaurant | #EF4444 | vendor_name |
| Transporte | directions_car | #F97316 | provider_name, destination |
| Servicios | electrical_services | #EAB308 | provider_name |
| Suscripciones | subscriptions | #8B5CF6 | service_name, billing_period |
| Software y tools | computer | #6366F1 | tool_name, billing_period |
| Marketing | campaign | #EC4899 | vendor_name |
| Educación | school | #14B8A6 | institution_name, course_name |
| Salud | health_and_safety | #22C55E | provider_name |
| Vivienda | home | #F59E0B | concept |
| Entretenimiento | sports_esports | #06B6D4 | venue_name |
| Otros gastos | remove_circle | #94A3B8 | — |

---

## Convenciones del backend

- **Single Responsibility:** cada archivo tiene una sola razón para cambiar.
- **Dependency Injection:** los servicios reciben la sesión de DB como parámetro.
- **No lógica en routers:** los routers solo validan input y delegan a services.
- **Pydantic para todo:** validación de entrada/salida siempre con schemas.
- **UUIDs en Python:** `id = str(uuid.uuid4())`, no generados por la DB.
- **Multi-tenancy:** todos los recursos tienen `user_id`; cada endpoint verifica ownership.
- **JWT Bearer:** todos los endpoints (excepto `/auth/register` y `/auth/login`) requieren
  `Authorization: Bearer <token>`.
- **Máximo 80 caracteres por línea.**
- **Type hints en todas las funciones.**
- **Contador de facturas atómico:** `UPDATE users SET invoice_counter = invoice_counter + 1 WHERE id = :uid RETURNING invoice_counter` — evita race conditions.

---

## Scheduler

APScheduler corre en background dentro del lifespan de FastAPI:

| Job | Horario UTC | Función |
|---|---|---|
| `check_and_send_reminders` | 09:00 diario | Procesa recordatorios pendientes |
| `check_expired_trials` | 10:00 diario | Revoca plan Pro cuando el trial expira |

---

## Generación de emails (GPT-4o-mini)

El email se genera con estas variables:
- **Remitente:** `sender_name` del cliente (fallback: `user.full_name`)
- **Idioma:** `email_language` del cliente (`es` | `en`)
- **Tono base:** `email_tone` del cliente (`formal` | `semi-formal` | `casual`)
- **Tratamiento:** `email_treatment` (`nombre` | `tu` | `usted`)
- **Escalación por días:**
  - 3 días → `friendly` (olvidó pagar, sin presión)
  - 7 días → `firm` (directo pero respetuoso)
  - 14 días → `final` (serio, indica próximos pasos)
- **Instrucciones adicionales:** campo libre `email_instructions` del cliente
- Fallback en caso de error de OpenAI: template genérico sin AI.

---

## Scan de comprobantes (GPT-4o Vision)

### Campos base (siempre extraídos)
`amount`, `currency`, `date` (YYYY-MM-DD), `description`

### Campos extras por categoría (`scan_fields`)
Se construye un prompt dinámico. GPT solo llena lo que encuentra — no inventa.
El resultado incluye `confidence` (0.0–1.0) y `warnings[]`.

### Manejo de errores
- Imagen no soportada → HTTP 400
- Archivo vacío → HTTP 400
- > 10 MB → HTTP 400
- Categoría no encontrada → HTTP 404
- Error de OpenAI o JSON inválido → retorna `confidence: 0.0`, campos nulos

---

## Generación de PDF (fpdf2)

Servicio `pdf_service.generate_invoice_pdf()`:
- Librería: `fpdf2==2.8.1` (Python puro, sin dependencias de sistema)
- Generado en memoria (`BytesIO`), retorna `bytes`
- Branding: header indigo-500 (#6366F1)
- Layout: sección DE/PARA, tabla de ítems con filas alternadas, total, notas
- Footer: "Generado con PayRemind · payremind.com"
- El PDF se adjunta al email como base64 via Resend `attachments`

---

## Guides para el agente Flutter

Los siguientes archivos explican al agente Flutter qué construir para cada feature:

| Archivo | Feature |
|---|---|
| `FLUTTER_INVOICE_EMIT_GUIDE.md` | Crear facturas con ítems, PDF y envío por email |
| `FLUTTER_TRANSACTION_SCAN_GUIDE.md` | Escanear comprobantes y registrar ingresos/egresos |
| `FLUTTER_DELETE_TRANSACTION_GUIDE.md` | Eliminar transacciones (swipe-to-delete, confirmación) |

---

## Migraciones Alembic

| Revision | Descripción |
|---|---|
| (base) | Tablas iniciales: users, clients, invoices, email_logs, categories, transactions, budgets |
| `e3f4a5b6c7d8` | Invoice emit: `invoice_counter` en users, `items`/`issued_date`/`sent_at` en invoices |
| `f4a5b6c7d8e9` | Transaction scan: `scan_fields` en categories, `extra_data` en transactions, UPDATE seed |

Para correr migraciones:
```bash
cd backend && alembic upgrade head
```

---

## Deploy

- **Backend → Railway:** push a `main` dispara auto-deploy. Los logs salen a stdout con
  `logging.basicConfig(stream=sys.stdout, ...)`.
- **Frontend → Vercel:** push a `main` dispara auto-deploy.
- **Sin Docker:** Railway detecta Python por `requirements.txt` y corre `uvicorn app.main:app`.
