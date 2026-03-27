import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth as auth_router
from app.routers import clients as clients_router
from app.routers import email_logs as email_logs_router
from app.routers import invoices as invoices_router
from app.routers import webhooks as webhooks_router

# Force stdout to flush immediately — required for Railway log streaming
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    force=True,
)

app = FastAPI(title="PayRemind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(clients_router.router, prefix="/clients", tags=["clients"])
app.include_router(invoices_router.router, prefix="/invoices", tags=["invoices"])
app.include_router(email_logs_router.router, prefix="/email-logs", tags=["email-logs"])
app.include_router(webhooks_router.router, prefix="/webhooks", tags=["webhooks"])
