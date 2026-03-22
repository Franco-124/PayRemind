# CLAUDE.md — PayRemind

Este archivo le da contexto a Claude Code sobre el proyecto.
Colócalo en la raíz del monorepo (`payremind/CLAUDE.md`).

## Qué es este proyecto
SaaS para freelancers que gestiona facturas pendientes y envía
recordatorios automáticos de cobro por email con tono que escala
según los días vencidos.

## Stack
- **Backend:** FastAPI (Python 3.11), SQLAlchemy 2.0, APScheduler, PostgreSQL
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Email:** Resend API
- **AI:** Anthropic Claude API (generación de emails)
- **Billing:** Lemon Squeezy
- **Deploy:** Backend → Railway | Frontend → Vercel

## Principios de código
- **Single Responsibility:** cada archivo tiene una sola razón para cambiar
- **Dependency Injection:** los servicios reciben la sesión de DB, no la crean
- **No lógica en routers:** los routers solo validan input y delegan a services
- **Pydantic para todo:** validación de entrada y salida siempre con schemas

## Estructura backend
```
app/
├── models/      # SQLAlchemy ORM models — solo estructura de datos
├── schemas/     # Pydantic schemas — validación request/response
├── routers/     # FastAPI routers — HTTP layer, sin lógica de negocio
├── services/    # Lógica de negocio — aquí vive todo el comportamiento
└── scheduler/   # APScheduler jobs — orquestación de tareas automáticas
```

## Convenciones Python
- Type hints en todas las funciones
- Docstrings en servicios y funciones complejas
- Variables y funciones en snake_case
- Clases en PascalCase
- Constantes en UPPER_SNAKE_CASE
- Máximo 80 caracteres por línea

## Convenciones TypeScript/React
- Componentes en PascalCase
- Hooks personalizados con prefijo `use`
- Props siempre tipadas con interface
- `async/await` sobre `.then()`

## Modelos de base de datos
Todos los modelos tienen:
- `id`: UUID generado en Python (no en DB)
- `user_id`: FK para multi-tenancy (cada usuario solo ve sus datos)
- `created_at`: timestamp automático

## Seguridad
- JWT en header Authorization: Bearer <token>
- Cada endpoint verifica que el recurso pertenece al usuario autenticado
- Variables sensibles siempre desde `settings`, nunca hardcodeadas

## Cómo NO escribir código aquí
- No usar `import *`
- No poner lógica de negocio en main.py
- No hacer queries SQL raw (usar SQLAlchemy ORM)
- No llamar a APIs externas desde los routers directamente