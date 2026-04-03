"""HTML email template for PayRemind reminder emails."""

_TONE_COLOR: dict[str, str] = {
    "friendly": "#22c55e",  # green
    "firm":     "#f59e0b",  # amber
    "final":    "#ef4444",  # red
}

_TONE_LABEL: dict[str, str] = {
    "friendly": "Recordatorio amistoso",
    "firm":     "Aviso importante",
    "final":    "Último aviso",
}


def build_email_html(
    freelancer_name: str,
    client_name: str,
    invoice_number: str,
    amount: float,
    currency: str,
    days_overdue: int,
    tone: str,
    body: str,
) -> str:
    """Build a professional HTML email for a payment reminder.

    Args:
        freelancer_name: Name of the freelancer sending the reminder.
        client_name: Name of the client receiving the reminder.
        invoice_number: Invoice reference number.
        amount: Invoice amount.
        currency: Currency code (e.g. USD, EUR).
        days_overdue: Days since the invoice was due.
        tone: One of "friendly", "firm", or "final".
        body: AI-generated plain-text email body.

    Returns:
        Full HTML string ready to send via Resend.
    """
    tone_color = _TONE_COLOR.get(tone, _TONE_COLOR["firm"])
    tone_label = _TONE_LABEL.get(tone, _TONE_LABEL["firm"])
    amount_formatted = f"{amount:,.2f} {currency}"
    body_html = body.replace("\n", "<br>")

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de pago — {invoice_number}</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   Helvetica, Arial, sans-serif;
    }}
    a {{ color: #4f46e5; text-decoration: none; }}
    @media (max-width: 600px) {{
      .card {{ padding: 24px 16px !important; }}
      .invoice-table td {{ display: block; width: 100%; }}
    }}
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f4f4f5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1e1b4b; border-radius:12px 12px 0 0;
                       padding:28px 40px; text-align:center;">
              <span style="font-size:22px; font-weight:700;
                           color:#ffffff; letter-spacing:-0.5px;">
                💰 PayRemind
              </span>
              <p style="margin:6px 0 0; font-size:13px; color:#a5b4fc;">
                Recordatorios automáticos de cobro
              </p>
            </td>
          </tr>

          <!-- Tone badge -->
          <tr>
            <td style="background:#312e81; padding:10px 40px; text-align:center;">
              <span style="display:inline-block; background:{tone_color};
                           color:#ffffff; font-size:12px; font-weight:600;
                           padding:4px 14px; border-radius:99px;
                           letter-spacing:0.5px; text-transform:uppercase;">
                {tone_label}
              </span>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td class="card"
                style="background:#ffffff; padding:40px; border-radius:0 0 12px 12px;
                       border:1px solid #e4e4e7; border-top:none;">

              <p style="margin:0 0 20px; font-size:16px; color:#18181b;
                         line-height:1.6;">
                {body_html}
              </p>

              <!-- Invoice summary card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     class="invoice-table"
                     style="background:#f8fafc; border:1px solid #e2e8f0;
                            border-radius:8px; margin:28px 0;">
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:12px; font-weight:600;
                                 color:#64748b; text-transform:uppercase;
                                 letter-spacing:0.5px;">Factura</span>
                    <p style="margin:4px 0 0; font-size:16px;
                               font-weight:700; color:#1e293b;">
                      {invoice_number}
                    </p>
                  </td>
                  <td style="padding:16px 20px; border-bottom:1px solid #e2e8f0;
                              text-align:right;">
                    <span style="font-size:12px; font-weight:600;
                                 color:#64748b; text-transform:uppercase;
                                 letter-spacing:0.5px;">Monto pendiente</span>
                    <p style="margin:4px 0 0; font-size:20px;
                               font-weight:800; color:{tone_color};">
                      {amount_formatted}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;">
                    <span style="font-size:12px; font-weight:600;
                                 color:#64748b; text-transform:uppercase;
                                 letter-spacing:0.5px;">Cliente</span>
                    <p style="margin:4px 0 0; font-size:14px; color:#1e293b;">
                      {client_name}
                    </p>
                  </td>
                  <td style="padding:14px 20px; text-align:right;">
                    <span style="font-size:12px; font-weight:600;
                                 color:#64748b; text-transform:uppercase;
                                 letter-spacing:0.5px;">Días vencida</span>
                    <p style="margin:4px 0 0; font-size:14px;
                               font-weight:700; color:{tone_color};">
                      {days_overdue} días
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer inside card -->
              <p style="margin:24px 0 0; font-size:13px; color:#94a3b8;
                         border-top:1px solid #f1f5f9; padding-top:20px;
                         line-height:1.6;">
                Este email fue enviado por <strong>{freelancer_name}</strong>
                a través de <strong>PayRemind</strong>.<br>
                Si ya realizaste el pago, por favor ignora este mensaje.
              </p>
            </td>
          </tr>

          <!-- Bottom footer -->
          <tr>
            <td style="text-align:center; padding:20px 0;">
              <p style="margin:0; font-size:11px; color:#94a3b8;">
                Powered by
                <a href="https://payremind.com"
                   style="color:#6366f1; font-weight:600;">PayRemind</a>
                &nbsp;·&nbsp; Recordatorios automáticos de cobro para freelancers
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
