import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth as auth_router
from app.routers import clients as clients_router
from app.routers import email_logs as email_logs_router
from app.routers import feedback as feedback_router
from app.routers import invoices as invoices_router
from app.routers import stats as stats_router
from app.routers import webhooks as webhooks_router
from app.scheduler.jobs import check_and_send_reminders, check_expired_trials

# Force stdout to flush immediately — required for Railway log streaming
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    force=True,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        check_and_send_reminders,
        trigger=CronTrigger(hour=9, minute=0),
        id="send_reminders",
        replace_existing=True,
    )
    scheduler.add_job(
        check_expired_trials,
        trigger=CronTrigger(hour=10, minute=0),
        id="check_expired_trials",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — reminders at 09:00 UTC, trial check at 10:00 UTC")
    yield
    scheduler.shutdown()
    logger.info("Scheduler stopped")


app = FastAPI(title="PayRemind API", lifespan=lifespan)

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
app.include_router(feedback_router.router, prefix="/feedback", tags=["feedback"])
app.include_router(webhooks_router.router, prefix="/webhooks", tags=["webhooks"])
app.include_router(stats_router.router, prefix="/stats", tags=["stats"])
