#!/bin/bash
# Ejecutar desde la carpeta donde quieres crear el proyecto
# chmod +x setup.sh && ./setup.sh

set -e  # detener si cualquier comando falla

echo "🚀 Creando monorepo PayRemind..."

# ── Raíz del monorepo ──────────────────────────────────────
mkdir payremind && cd payremind
git init

# .gitignore raíz
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*.pyo
.env
.venv
venv/
*.egg-info/

# Node
node_modules/
.next/
.env.local
.env*.local

# General
.DS_Store
*.log
.idea/
.vscode/
EOF

# README raíz
cat > README.md << 'EOF'
# PayRemind
Gestor de pagos pendientes con recordatorios automáticos para freelancers.

## Estructura
- `backend/` — FastAPI (Python) → Deploy en Railway
- `frontend/` — Next.js 14 → Deploy en Vercel

## Desarrollo local
Ver README.md en cada carpeta.
EOF

echo "✅ Raíz del monorepo creada"

# ── BACKEND ────────────────────────────────────────────────
mkdir -p backend/app/{models,schemas,routers,services,scheduler}
mkdir -p backend/tests
mkdir -p backend/alembic/versions
cd backend

# Entorno virtual Python
python -m venv .venv
source .venv/bin/activate  # en Windows: .venv\Scripts\activate

# requirements.txt
cat > requirements.txt << 'EOF'
# Web framework
fastapi==0.115.0
uvicorn[standard]==0.30.6

# Base de datos
sqlalchemy==2.0.35
alembic==1.13.3
psycopg2-binary==2.9.9

# Validación
pydantic==2.9.2
pydantic-settings==2.5.2

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12

# Scheduler
apscheduler==3.10.4

# Email
resend==2.4.0

# AI
anthropic==0.37.1

# Utils
python-dotenv==1.0.1
httpx==0.27.2
EOF

pip install -r requirements.txt

# ── Archivos del backend ───────────────────────────────────

# config.py — Settings centralizados con pydantic-settings
cat > app/config.py << 'EOF'
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str

    # Auth
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # External services
    resend_api_key: str
    anthropic_api_key: str
    lemon_squeezy_webhook_secret: str

    # App
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
EOF

# database.py — Engine y sesión
cat > app/database.py << 'EOF'
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # reconecta si la conexión se cayó
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency para inyectar sesión de DB en los routers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF

# main.py — Entry point
cat > app/main.py << 'EOF'
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.scheduler.jobs import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestiona el ciclo de vida de la app: arrancar/detener scheduler."""
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="PayRemind API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}
EOF

# scheduler/jobs.py — APScheduler setup
cat > app/scheduler/jobs.py << 'EOF'
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = BackgroundScheduler()


def check_and_send_reminders():
    """
    Job principal: revisa facturas vencidas y envía recordatorios.
    Se implementa completamente en reminder_service.py
    """
    from app.database import SessionLocal
    from app.services.reminder_service import ReminderService

    db = SessionLocal()
    try:
        service = ReminderService(db)
        service.process_pending_reminders()
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        check_and_send_reminders,
        trigger=CronTrigger(hour=9, minute=0),  # 9:00 AM UTC diario
        id="daily_reminders",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown()
EOF

# .env de ejemplo
cat > .env.example << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/payremind
SECRET_KEY=your-super-secret-key-minimum-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

RESEND_API_KEY=re_xxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
LEMON_SQUEEZY_WEBHOOK_SECRET=xxxxxxxxxxxx

FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
EOF

# Procfile para Railway
cat > Procfile << 'EOF'
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
EOF

# railway.toml
cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
restartPolicyType = "on_failure"
EOF

# alembic.ini base
cat > alembic.ini << 'EOF'
[alembic]
script_location = alembic
sqlalchemy.url = %(DATABASE_URL)s

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
EOF

# alembic/env.py
cat > alembic/env.py << 'EOF'
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.database import Base
# Importar todos los modelos para que Alembic los detecte
import app.models  # noqa: F401

config = context.config

# Leer DATABASE_URL desde variable de entorno (Railway la inyecta)
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
EOF

# __init__.py para que Python reconozca los paquetes
touch app/__init__.py
touch app/models/__init__.py
touch app/schemas/__init__.py
touch app/routers/__init__.py
touch app/services/__init__.py
touch app/scheduler/__init__.py
touch tests/__init__.py

echo "✅ Backend creado"

# ── FRONTEND ───────────────────────────────────────────────
cd ..
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd frontend

# Instalar dependencias adicionales
npm install \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-label \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slot \
  @radix-ui/react-toast \
  class-variance-authority \
  clsx \
  lucide-react \
  tailwind-merge \
  date-fns \
  axios

# .env.local de ejemplo
cat > .env.local.example << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
EOF

# lib/api-client.ts — cliente HTTP centralizado
mkdir -p lib
cat > lib/api-client.ts << 'EOF'
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

// Inyectar token en cada request automáticamente
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirigir a login si el token expiró
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
EOF

# vercel.json
cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
EOF

echo "✅ Frontend creado"

# ── Git inicial ────────────────────────────────────────────
cd ..
git add .
git commit -m "chore: initial monorepo setup — backend FastAPI + frontend Next.js"

echo ""
echo "🎉 Setup completo. Estructura creada:"
echo ""
echo "payremind/"
echo "├── backend/    → FastAPI + APScheduler → Railway"
echo "└── frontend/   → Next.js 14            → Vercel"
echo ""
echo "Próximos pasos:"
echo "1. Copia backend/.env.example → backend/.env y completa las variables"
echo "2. Copia frontend/.env.local.example → frontend/.env.local"
echo "3. Levanta PostgreSQL local (ver instrucciones abajo)"
echo "4. cd backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "5. cd frontend && npm run dev"