"""transaction scan — add scan_fields to categories, extra_data to transactions, update seed

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-06-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "f4a5b6c7d8e9"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None

# scan_fields per category name
_SCAN_FIELDS = {
    "Pago de factura":     ["client_name", "invoice_number"],
    "Proyecto freelance":  ["client_name", "project_name"],
    "Consultoría":         ["client_name"],
    "Productos digitales": ["product_name"],
    "Inversiones":         ["instrument_name"],
    "Otros ingresos":      [],
    "Alimentación":        ["vendor_name"],
    "Transporte":          ["provider_name", "destination"],
    "Servicios":           ["provider_name"],
    "Suscripciones":       ["service_name", "billing_period"],
    "Software y tools":    ["tool_name", "billing_period"],
    "Marketing":           ["vendor_name"],
    "Educación":           ["institution_name", "course_name"],
    "Salud":               ["provider_name"],
    "Vivienda":            ["concept"],
    "Entretenimiento":     ["venue_name"],
    "Otros gastos":        [],
}


def upgrade() -> None:
    op.add_column("categories", sa.Column("scan_fields", JSONB(), nullable=True))
    op.add_column("transactions", sa.Column("extra_data", JSONB(), nullable=True))

    bind = op.get_bind()
    import json
    for name, fields in _SCAN_FIELDS.items():
        bind.execute(
            sa.text(
                "UPDATE categories SET scan_fields = :fields "
                "WHERE name = :name AND user_id IS NULL"
            ),
            {"fields": json.dumps(fields), "name": name},
        )


def downgrade() -> None:
    op.drop_column("transactions", "extra_data")
    op.drop_column("categories", "scan_fields")
