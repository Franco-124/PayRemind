import io
import logging
from datetime import date

from fpdf import FPDF

logger = logging.getLogger(__name__)

_BRAND_COLOR = (99, 102, 241)   # indigo-500
_GRAY = (100, 100, 100)
_LIGHT_GRAY = (240, 240, 240)
_BLACK = (30, 30, 30)
_WHITE = (255, 255, 255)


class _InvoicePDF(FPDF):
    """Custom FPDF subclass with header/footer helpers."""

    def set_invoice_meta(
        self,
        freelancer_name: str,
        invoice_number: str,
        issued_date: date,
        due_date: date,
    ) -> None:
        self._freelancer_name = freelancer_name
        self._invoice_number = invoice_number
        self._issued_date = issued_date
        self._due_date = due_date

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*_GRAY)
        self.cell(0, 10, "Generado con PayRemind · payremind.com", align="C")


def generate_invoice_pdf(
    invoice_number: str,
    freelancer_name: str,
    freelancer_email: str,
    client_name: str,
    client_email: str,
    client_company: str | None,
    items: list[dict],
    total: float,
    currency: str,
    issued_date: date,
    due_date: date,
    notes: str | None = None,
) -> bytes:
    """Generate an invoice PDF in memory and return raw bytes.

    Args:
        items: list of dicts with keys: description, quantity, unit_price, total
    Returns:
        PDF as bytes (never raises — logs errors and returns minimal PDF on failure)
    """
    try:
        pdf = _InvoicePDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_margins(15, 15, 15)

        # ── Header ────────────────────────────────────────────────────────────
        pdf.set_fill_color(*_BRAND_COLOR)
        pdf.rect(0, 0, 210, 28, style="F")

        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(*_WHITE)
        pdf.set_xy(15, 8)
        pdf.cell(100, 10, "FACTURA", ln=0)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_xy(140, 6)
        pdf.cell(55, 6, f"N° {invoice_number}", align="R", ln=1)
        pdf.set_xy(140, 12)
        pdf.cell(55, 6, f"Emisión: {issued_date.strftime('%d/%m/%Y')}", align="R", ln=1)
        pdf.set_xy(140, 18)
        pdf.cell(55, 6, f"Vencimiento: {due_date.strftime('%d/%m/%Y')}", align="R", ln=1)

        pdf.ln(18)

        # ── From / To ─────────────────────────────────────────────────────────
        pdf.set_text_color(*_BLACK)
        col_w = 88

        # From
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_GRAY)
        pdf.cell(col_w, 6, "DE", ln=0)
        pdf.set_x(15 + col_w + 4)
        pdf.cell(col_w, 6, "PARA", ln=1)

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*_BLACK)
        pdf.cell(col_w, 7, freelancer_name, ln=0)
        pdf.set_x(15 + col_w + 4)
        pdf.cell(col_w, 7, client_name, ln=1)

        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_GRAY)
        pdf.cell(col_w, 5, freelancer_email, ln=0)
        pdf.set_x(15 + col_w + 4)
        company_line = client_company or ""
        pdf.cell(col_w, 5, company_line, ln=1)

        pdf.set_x(15 + col_w + 4)
        pdf.cell(col_w, 5, client_email, ln=1)

        pdf.ln(8)

        # ── Items table header ────────────────────────────────────────────────
        pdf.set_fill_color(*_BRAND_COLOR)
        pdf.set_text_color(*_WHITE)
        pdf.set_font("Helvetica", "B", 9)

        col_desc = 90
        col_qty = 20
        col_price = 32
        col_total = 33

        pdf.cell(col_desc, 8, "Descripción", fill=True, ln=0)
        pdf.cell(col_qty, 8, "Cant.", fill=True, align="C", ln=0)
        pdf.cell(col_price, 8, f"Precio ({currency})", fill=True, align="R", ln=0)
        pdf.cell(col_total, 8, f"Total ({currency})", fill=True, align="R", ln=1)

        # ── Items rows ────────────────────────────────────────────────────────
        pdf.set_font("Helvetica", "", 9)
        fill = False
        for item in items:
            pdf.set_fill_color(*_LIGHT_GRAY)
            pdf.set_text_color(*_BLACK)
            item_total = item.get("total") or (item["quantity"] * item["unit_price"])
            pdf.cell(col_desc, 7, str(item["description"])[:55], fill=fill, ln=0)
            pdf.cell(col_qty, 7, str(item["quantity"]), fill=fill, align="C", ln=0)
            pdf.cell(col_price, 7, f"{item['unit_price']:,.2f}", fill=fill, align="R", ln=0)
            pdf.cell(col_total, 7, f"{item_total:,.2f}", fill=fill, align="R", ln=1)
            fill = not fill

        # ── Total ─────────────────────────────────────────────────────────────
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(*_BRAND_COLOR)
        pdf.set_text_color(*_WHITE)
        pdf.cell(col_desc + col_qty + col_price, 9, "TOTAL", fill=True, align="R", ln=0)
        pdf.cell(col_total, 9, f"{total:,.2f} {currency}", fill=True, align="R", ln=1)

        # ── Notes ─────────────────────────────────────────────────────────────
        if notes:
            pdf.ln(8)
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(*_GRAY)
            pdf.cell(0, 6, "Notas", ln=1)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*_BLACK)
            pdf.multi_cell(0, 5, notes)

        buf = io.BytesIO()
        pdf.output(buf)
        return buf.getvalue()

    except Exception as e:
        logger.error("PDF generation failed: %s", e)
        raise
