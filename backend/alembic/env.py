import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context

# Import Base and all models so Alembic can detect all mapped tables
from app.models import Base  # noqa: F401 — must be imported before models
from app.models import Client, EmailLog, Invoice, User  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return os.environ["DATABASE_URL"]


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL script)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    raw_url = os.environ.get("DATABASE_URL", "")

    if raw_url.startswith("postgresql://"):
        db_url = raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif raw_url.startswith("postgres://"):
        db_url = raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    else:
        db_url = raw_url

    connectable = create_engine(db_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
