"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

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
  email_logs?: EmailLog[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", overdue: "Vencida", paid: "Pagada", cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [detailInvoice, setDetailInvoice] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [markingId, setMarkingId] = useState<string | null>(null);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function fetchInvoices() {
    try {
      const url = statusFilter ? `/invoices/?invoice_status=${statusFilter}` : "/invoices/";
      const data = await apiClient.get<Invoice[]>(url);
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar facturas");
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
    setFormError("");
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
      flash("Factura creada correctamente");
      fetchInvoices();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al crear factura");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(id: string) {
    setMarkingId(id);
    try {
      await apiClient.patch(`/invoices/${id}/status`, { status: "paid" });
      flash("Factura marcada como pagada");
      fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setMarkingId(null);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const data = await apiClient.get<InvoiceDetail>(`/invoices/${id}`);
      setDetailInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar detalle");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
        {clients.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
            <span>⚠️</span>
            <span>Primero debés <a href="/clients" className="font-semibold underline hover:text-yellow-900">registrar un cliente</a> para crear facturas.</span>
          </div>
        ) : (
          <button
            onClick={() => { setCreateOpen(true); setFormError(""); }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            + Nueva factura
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">Cargando...</div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">
            No hay facturas para este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["#", "Cliente", "Monto", "Vencimiento", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-mono text-gray-700">{inv.invoice_number}</td>
                    <td className="px-6 py-3 text-gray-900">{inv.client.name}</td>
                    <td className="px-6 py-3 text-gray-900">
                      {inv.currency} {Number(inv.amount).toLocaleString("es")}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{inv.due_date}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {inv.status !== "paid" && inv.status !== "cancelled" && (
                          <button
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={markingId === inv.id}
                            className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-50 transition"
                          >
                            {markingId === inv.id ? "..." : "Marcar pagada"}
                          </button>
                        )}
                        <button
                          onClick={() => openDetail(inv.id)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium transition"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva factura</h2>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={labelCls}>Cliente *</label>
                <select
                  required value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Número de factura *</label>
                  <input
                    type="text" required value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    className={inputCls} placeholder="INV-001"
                  />
                </div>
                <div>
                  <label className={labelCls}>Moneda</label>
                  <input
                    type="text" maxLength={3} value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className={inputCls} placeholder="USD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Monto *</label>
                  <input
                    type="number" required min="0.01" step="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className={inputCls} placeholder="1500.00"
                  />
                </div>
                <div>
                  <label className={labelCls}>Vencimiento *</label>
                  <input
                    type="date" required value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Descripción</label>
                <textarea
                  rows={2} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputCls} placeholder="Opcional"
                />
              </div>

              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, reminder_active: !form.reminder_active })}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${
                    form.reminder_active ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow mt-0.5 transition-transform ${
                      form.reminder_active ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  Recordatorios automáticos{" "}
                  <span className="text-gray-400">(días 3, 7 y 14)</span>
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
            ) : detailInvoice ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Factura {detailInvoice.invoice_number}
                    </h2>
                    <p className="text-sm text-gray-500">{detailInvoice.client.name}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[detailInvoice.status]}`}>
                    {STATUS_LABEL[detailInvoice.status]}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm mb-6">
                  <Dt label="Monto">{detailInvoice.currency} {Number(detailInvoice.amount).toLocaleString("es")}</Dt>
                  <Dt label="Vencimiento">{detailInvoice.due_date}</Dt>
                  {detailInvoice.description && (
                    <Dt label="Descripción" full>{detailInvoice.description}</Dt>
                  )}
                </dl>

                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Historial de emails
                </h3>
                {!detailInvoice.email_logs || detailInvoice.email_logs.length === 0 ? (
                  <p className="text-sm text-gray-400">No se han enviado emails aún.</p>
                ) : (
                  <div className="space-y-2">
                    {detailInvoice.email_logs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-gray-200 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            Día {log.reminder_day} · {log.tone}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-gray-500 mt-1">
                          {new Date(log.sent_at).toLocaleString("es")}
                        </p>
                        {log.error_message && (
                          <p className="text-red-600 text-xs mt-1">{log.error_message}</p>
                        )}
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

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

function Dt({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{children}</dd>
    </div>
  );
}
