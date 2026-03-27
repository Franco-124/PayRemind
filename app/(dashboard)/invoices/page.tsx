"use client";

import { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToastContext } from "@/app/components/ui/toast-provider";
import { validateRequired, validateAmount } from "@/app/lib/validations";
import { CURRENCIES } from "@/app/lib/currencies";

interface Client {
  id: string;
  name: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  reminder_day: number;
  tone: string;
  status: string;
  sent_at: string;
  error_message: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: "pending" | "overdue" | "paid" | "cancelled";
  description: string | null;
  reminder_config: { active: boolean; intervals: number[] };
  created_at: string;
  client: Client;
}

interface InvoiceDetail extends Invoice {
  email_logs: EmailLog[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", overdue: "Vencida", paid: "Pagada", cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border border-yellow-200",
  overdue:   "bg-red-50 text-red-700 border border-red-200",
  paid:      "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-gray-100 text-gray-600 border border-gray-200",
};
const TONE_LABEL: Record<string, string> = {
  friendly: "Amable", firm: "Firme", final: "Final",
};

interface CreateForm {
  client_id: string;
  invoice_number: string;
  amount: string;
  currency: string;
  due_date: string;
  description: string;
  reminder_active: boolean;
}

const EMPTY_FORM: CreateForm = {
  client_id: "", invoice_number: "", amount: "", currency: "USD",
  due_date: "", description: "", reminder_active: true,
};

function nextReminderLabel(inv: Invoice): string {
  if (inv.status === "paid" || inv.status === "cancelled") return "—";
  if (!inv.reminder_config.active) return "⏸ Pausado";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(inv.due_date + "T00:00:00");
  const daysSinceDue = Math.floor((today.getTime() - due.getTime()) / 86400000);

  if (daysSinceDue < 0) return `Vence en ${Math.abs(daysSinceDue)} días`;

  const intervals = inv.reminder_config.intervals ?? [3, 7, 14];
  const next = intervals.find((d) => d > daysSinceDue);
  if (next !== undefined) {
    const daysLeft = next - daysSinceDue;
    return `Día ${next} — en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`;
  }
  return "Ciclo completado";
}

export default function InvoicesPage() {
  const toast = useToastContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const [detailInvoice, setDetailInvoice] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const [showCustomCurrency, setShowCustomCurrency] = useState(false);
  const [reminderToggleTouched, setReminderToggleTouched] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  async function fetchInvoices() {
    try {
      const url = statusFilter ? `/invoices/?invoice_status=${statusFilter}` : "/invoices/";
      const data = await apiClient.get<Invoice[]>(url);
      setInvoices(data);
    } catch {
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }

  async function fetchClients() {
    try {
      const data = await apiClient.get<Client[]>("/clients/");
      setClients(data);
    } catch { /* non-blocking */ }
  }

  useEffect(() => { fetchInvoices(); fetchClients(); }, []);
  useEffect(() => { setLoading(true); fetchInvoices(); }, [statusFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<keyof CreateForm, string>> = {};
    const clientErr = validateRequired(form.client_id, "cliente");
    const numErr = validateRequired(form.invoice_number, "número de factura");
    const amtErr = validateAmount(form.amount);
    const dateErr = validateRequired(form.due_date, "vencimiento");
    if (clientErr) errs.client_id = clientErr;
    if (numErr) errs.invoice_number = numErr;
    if (amtErr) errs.amount = amtErr;
    if (dateErr) errs.due_date = dateErr;
    if (!form.currency) {
      errs.currency = showCustomCurrency
        ? form.currency.length < 2
          ? "El código debe tener al menos 2 caracteres"
          : "Ingresa el código de la moneda"
        : "Selecciona una moneda";
    } else if (showCustomCurrency && form.currency.length < 2) {
      errs.currency = "El código debe tener al menos 2 caracteres";
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setFormErrors({});

    // Warn if due date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(form.due_date + "T00:00:00");
    if (due < today) {
      toast.warning("La fecha de vencimiento ya pasó. Los recordatorios iniciarán inmediatamente.");
    }

    setSaving(true);
    try {
      await apiClient.post("/invoices/", {
        client_id: form.client_id,
        invoice_number: form.invoice_number,
        amount: parseFloat(form.amount),
        currency: form.currency,
        due_date: form.due_date,
        description: form.description || null,
        reminder_config: { intervals: [3, 7, 14], active: form.reminder_active },
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setShowCustomCurrency(false);
      setReminderToggleTouched(false);
      toast.success("Factura creada correctamente");
      fetchInvoices();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "free_plan_limit_reached") {
        setCreateOpen(false);
        setUpgradeOpen(true);
      } else {
        toast.error("Error al crear la factura");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(id: string) {
    setActionId(id + ":paid");
    try {
      await apiClient.patch(`/invoices/${id}/status`, { status: "paid" });
      toast.success("Factura marcada como pagada ✓");
      fetchInvoices();
    } catch {
      toast.error("Error, intenta de nuevo");
    } finally {
      setActionId(null);
    }
  }

  async function handleToggleReminder(id: string, currentlyActive: boolean) {
    setActionId(id + ":toggle");
    try {
      await apiClient.patch(`/invoices/${id}/reminders/toggle`, {});
      if (currentlyActive) {
        toast.warning("Recordatorios pausados");
      } else {
        toast.success("Recordatorios activados");
      }
      fetchInvoices();
    } catch {
      toast.error("Error, intenta de nuevo");
    } finally {
      setActionId(null);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const data = await apiClient.get<InvoiceDetail>(`/invoices/${id}`);
      setDetailInvoice(data);
    } catch {
      toast.error("Error al cargar detalle");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSendNow(id: string) {
    setSendingReminder(true);
    try {
      await apiClient.post(`/invoices/${id}/test-reminder`, {});
      toast.success("Recordatorio enviado");
      const updated = await apiClient.get<InvoiceDetail>(`/invoices/${id}`);
      setDetailInvoice(updated);
    } catch {
      toast.error("Error al enviar el recordatorio");
    } finally {
      setSendingReminder(false);
    }
  }

  const inputCls = (err?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-100 transition ${err ? "border-red-400 focus:border-red-400" : "border-gray-300 focus:border-indigo-500"}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-sm text-gray-500 mt-1">Seguimiento de cobros y recordatorios automáticos</p>
        </div>
        {clients.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
            <span>⚠️</span>
            <span>Primero debés <a href="/clients" className="font-semibold underline hover:text-yellow-900">registrar un cliente</a> para crear facturas.</span>
          </div>
        ) : (
          <button
            onClick={() => { setCreateOpen(true); setFormErrors({}); }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-150"
          >
            + Nueva factura
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        <span className="mt-0.5 shrink-0">ℹ️</span>
        <span>
          Los recordatorios se envían automáticamente a las <strong>9:00 AM UTC</strong> en los días <strong>3, 7 y 14</strong> después del vencimiento.
          Marcá una factura como pagada para detenerlos.
        </span>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "pending", "overdue", "paid", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              statusFilter === s
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "" ? "Todos" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">Cargando...</div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">No hay facturas para este filtro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["#", "Cliente", "Monto", "Vencimiento", "Estado", "Próx. recordatorio", "Acciones"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const isActive = inv.status === "pending" || inv.status === "overdue";
                  const isPaid = actionId === inv.id + ":paid";
                  const isToggling = actionId === inv.id + ":toggle";
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-900">{inv.client.name}</td>
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                        {inv.currency} {Number(inv.amount).toLocaleString("es")}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{inv.due_date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
                          {STATUS_LABEL[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        {inv.status === "paid" || inv.status === "cancelled" ? (
                          <span className="text-gray-400">—</span>
                        ) : !inv.reminder_config.active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-xs font-medium">⏸ Pausado</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                            <Clock className="w-3 h-3" />
                            {nextReminderLabel(inv)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isActive && (
                            <>
                              <button
                                onClick={() => handleMarkPaid(inv.id)}
                                disabled={!!actionId}
                                className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-50 transition whitespace-nowrap"
                              >
                                {isPaid ? "..." : "✓ Pagada"}
                              </button>
                              <button
                                onClick={() => handleToggleReminder(inv.id, inv.reminder_config.active)}
                                disabled={!!actionId}
                                className="text-gray-500 hover:text-gray-800 text-xs font-medium disabled:opacity-50 transition whitespace-nowrap"
                              >
                                {isToggling ? "..." : inv.reminder_config.active ? "⏸ Pausar" : "▶ Reanudar"}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openDetail(inv.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium transition whitespace-nowrap"
                          >
                            Ver emails
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {upgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
              <span className="text-2xl">🚀</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Límite del plan Free alcanzado</h2>
            <p className="text-sm text-gray-500 mb-6">
              El plan gratuito permite hasta <strong>3 facturas activas</strong>. Actualizá al plan Pro para crear facturas ilimitadas con recordatorios automáticos.
            </p>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-4 mb-6 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-indigo-900">Plan Pro</span>
                <span className="text-xl font-bold text-indigo-700">$12/mes</span>
              </div>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>✓ Facturas ilimitadas</li>
                <li>✓ Recordatorios automáticos</li>
                <li>✓ Emails generados con IA</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUpgradeOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Ahora no
              </button>
              <a
                href="https://payremind.lemonsqueezy.com/checkout/buy/69ade413-496f-479e-b5db-a1aa7314f163"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition text-center"
              >
                Actualizar a Pro
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva factura</h2>

            <form noValidate onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  value={form.client_id}
                  onChange={(e) => { setForm({ ...form, client_id: e.target.value }); setFormErrors((p) => ({ ...p, client_id: undefined })); }}
                  className={inputCls(formErrors.client_id)}
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {formErrors.client_id && <p className="mt-1 text-xs text-red-600">{formErrors.client_id}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de factura *</label>
                  <input
                    type="text"
                    value={form.invoice_number}
                    onChange={(e) => { setForm({ ...form, invoice_number: e.target.value }); setFormErrors((p) => ({ ...p, invoice_number: undefined })); }}
                    className={inputCls(formErrors.invoice_number)}
                    placeholder="INV-001"
                  />
                  {formErrors.invoice_number && <p className="mt-1 text-xs text-red-600">{formErrors.invoice_number}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                  <select
                    value={showCustomCurrency ? "OTHER" : form.currency}
                    onChange={(e) => {
                      if (e.target.value === "OTHER") {
                        setShowCustomCurrency(true);
                        setForm({ ...form, currency: "" });
                      } else {
                        setShowCustomCurrency(false);
                        setForm({ ...form, currency: e.target.value });
                      }
                      setFormErrors((p) => ({ ...p, currency: undefined }));
                    }}
                    className={inputCls(formErrors.currency)}
                  >
                    <option value="">Seleccionar moneda</option>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  {showCustomCurrency && (
                    <input
                      type="text"
                      maxLength={3}
                      value={form.currency}
                      onChange={(e) => {
                        setForm({ ...form, currency: e.target.value.toUpperCase() });
                        setFormErrors((p) => ({ ...p, currency: undefined }));
                      }}
                      className={`mt-2 ${inputCls(formErrors.currency)}`}
                      placeholder="Ej: CHF, NOK, JPY..."
                    />
                  )}
                  {formErrors.currency && <p className="mt-1 text-xs text-red-600">{formErrors.currency}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => { setForm({ ...form, amount: e.target.value }); setFormErrors((p) => ({ ...p, amount: undefined })); }}
                    className={inputCls(formErrors.amount)}
                    placeholder="1500.00"
                  />
                  {formErrors.amount && <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento *</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => { setForm({ ...form, due_date: e.target.value }); setFormErrors((p) => ({ ...p, due_date: undefined })); }}
                    className={inputCls(formErrors.due_date)}
                  />
                  {formErrors.due_date && <p className="mt-1 text-xs text-red-600">{formErrors.due_date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputCls()}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <div className="flex items-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => { setReminderToggleTouched(true); setForm({ ...form, reminder_active: !form.reminder_active }); }}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${form.reminder_active ? "bg-indigo-600" : "bg-gray-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow mt-0.5 transition-transform ${form.reminder_active ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-sm text-gray-700">
                    Recordatorios automáticos <span className="text-gray-400">(días 3, 7 y 14)</span>
                  </span>
                </div>
                {reminderToggleTouched && !form.reminder_active && (
                  <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex gap-3">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-yellow-700">
                      <span className="font-semibold text-yellow-800">Recordatorios desactivados.</span>
                      {" "}Deberás enviar los emails de cobro manualmente desde el detalle de cada factura.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setFormErrors({}); setShowCustomCurrency(false); setReminderToggleTouched(false); }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {saving ? "Creando..." : "Crear factura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {(detailInvoice || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
            ) : detailInvoice ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Factura {detailInvoice.invoice_number}</h2>
                    <p className="text-sm text-gray-500">{detailInvoice.client.name}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[detailInvoice.status]}`}>
                    {STATUS_LABEL[detailInvoice.status]}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <Dt label="Monto">{detailInvoice.currency} {Number(detailInvoice.amount).toLocaleString("es")}</Dt>
                  <Dt label="Vencimiento">{detailInvoice.due_date}</Dt>
                  <Dt label="Días vencida">
                    {(() => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const due = new Date(detailInvoice.due_date + "T00:00:00");
                      const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
                      return days < 0 ? `Vence en ${Math.abs(days)} días` : `${days} días`;
                    })()}
                  </Dt>
                  <Dt label="Recordatorios">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${detailInvoice.reminder_config.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {detailInvoice.reminder_config.active ? "▶ Activos" : "⏸ Pausados"}
                    </span>
                  </Dt>
                  {detailInvoice.description && <Dt label="Descripción" full>{detailInvoice.description}</Dt>}
                </dl>

                {(detailInvoice.status === "pending" || detailInvoice.status === "overdue") && (
                  <button
                    onClick={() => handleSendNow(detailInvoice.id)}
                    disabled={sendingReminder}
                    className="w-full mb-5 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition"
                  >
                    {sendingReminder ? "Enviando..." : "📧 Enviar recordatorio ahora"}
                  </button>
                )}

                <h3 className="text-sm font-semibold text-gray-900 mb-3">Historial de emails</h3>
                {!detailInvoice.email_logs || detailInvoice.email_logs.length === 0 ? (
                  <p className="text-sm text-gray-400">No se han enviado emails aún.</p>
                ) : (
                  <div className="space-y-2">
                    {detailInvoice.email_logs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-gray-200 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">Día {log.reminder_day}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">{TONE_LABEL[log.tone] ?? log.tone}</span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${log.status === "sent" ? "bg-green-100 text-green-700" : log.status === "opened" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                            {log.status === "sent" ? "Enviado" : log.status === "opened" ? "Abierto" : "Fallido"}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">{new Date(log.sent_at).toLocaleString("es")}</p>
                        {log.error_message && <p className="text-red-600 text-xs mt-1">{log.error_message}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setDetailInvoice(null)}
                  className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cerrar
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Dt({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{children}</dd>
    </div>
  );
}
