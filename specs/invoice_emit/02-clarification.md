# Clarifications: Invoice Emit & Finance Integration

## Questions & Answers

**Q1: ¿El campo `invoice_number` en `POST /invoices/` existente se auto-asigna o sigue siendo requerido?**
A: Se auto-asigna siempre. `invoice_number` deja de ser un campo que el usuario provea —
el backend lo genera en ambos endpoints (`POST /invoices/` y `POST /invoices/emit`).
El campo se elimina de `InvoiceCreate`.

**Q2: ¿El PDF muestra el nombre del negocio del freelancer o solo su nombre de usuario?**
A: Solo el `full_name` del usuario (User.full_name). No se agrega ningún campo nuevo al modelo.

**Q3: ¿El PDF solo se envía por email o el freelancer también puede descargarlo?**
A: Ambas cosas. El PDF se envía al cliente por email al emitir la factura, y además
el freelancer puede descargarlo vía `GET /invoices/{id}/pdf`. El backend regenera el PDF
on-demand a partir de los datos persistidos — no se almacena el archivo.

**Q4: Cuando `fill_with_ai: true` en la transacción desde scan, ¿GPT completa los campos?**
A: No. Si un campo no se encontró en la imagen, queda vacío/null. No se hace ninguna
llamada adicional a GPT. El flag `fill_with_ai` se elimina del contrato — simplifica el endpoint.

**Q5: ¿El email de la factura al cliente respeta `client.email_language`?**
A: Siempre en español, sin importar la configuración del cliente.

## Open Decisions

- Ninguno. Todas las ambigüedades están resueltas.

## Resumen de cambios al spec

Con estas respuestas, las siguientes decisiones quedan firmes:

1. `invoice_number` es **siempre auto-generado** — se elimina de `InvoiceCreate`.
2. El PDF es **regenerable on-demand** — `GET /invoices/{id}/pdf` debe existir.
3. `TransactionFromScanRequest` **no tiene `fill_with_ai`** — si el scan no encontró el dato, el cliente lo provee o queda vacío.
4. El email de emisión de factura es **siempre en español**.
5. No hay campos nuevos en `User` — el PDF usa `full_name`.
