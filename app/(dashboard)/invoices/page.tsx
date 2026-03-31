"use client";

import { useEffect, useState } from "react";
import {
  Clock, AlertCircle, Lock, CheckCircle, PauseCircle,
  PlayCircle, Send, History, Loader2, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToastContext } from "@/app/components/ui/toast-provider";
import { validateRequired, validateAmount } from "@/app/lib/validations";
import { CURRENCIES } from "@/app/lib/currencies";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useLanguage } from "@/app/contexts/language-context";

interface Client {
  id: string;
  name: string;
  email_language: string;
  email_tone: string;
  email_treatment: string;
  sender_name: string | null;
  email_instructions: string | null;
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
  email_config_override: Record<string, string> | null;
  created_at: string;
  client: Client;
}

interface InvoiceDetail extends Invoice {
  email_logs: EmailLog[];
  email_config_override: Record<string, string> | null;
}

const STATUS_LABEL_KEY: Record<string, string> = {
  pending: "invoices.filter.pending", overdue: "invoices.filter.overdue",
  paid: "invoices.filter.paid", cancelled: "invoices.filter.cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  overdue:   "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  paid:      "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  cancelled: "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600",
};
const TONE_LABEL_KEY: Record<string, string> = {
  friendly: "emails.tone.friendly", firm: "emails.tone.firm", final: "emails.tone.final",
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
  useRequireAuth();
  const toast = useToastContext();
  const { t } = useLanguage();
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

  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [showCustomCurrency, setShowCustomCurrency] = useState(false);
  const [reminderToggleTouched, setReminderToggleTouched] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [emailOverride, setEmailOverride] = useState({
    language: "es", tone: "semi-formal", treatment: "nombre",
    sender_name: "", instructions: "",
  });

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

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    apiClient.get<{ plan: "free" | "pro" }>("/auth/me")
      .then((me) => setUserPlan(me.plan))
      .catch(() => {});
  }, []);
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(form.due_date + "T00:00:00");
    if (due < today && userPlan === "pro" && form.reminder_active) {
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
        email_config_override: showEmailConfig ? {
          language: emailOverride.language,
          tone: emailOverride.tone,
          treatment: emailOverride.treatment,
          sender_name: emailOverride.sender_name || null,
          instructions: emailOverride.instructions || null,
        } : null,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setShowCustomCurrency(false);
      setReminderToggleTouched(false);
      setShowEmailConfig(false);
      setEmailOverride({ language: "es", tone: "semi-formal", treatment: "nombre", sender_name: "", instructions: "" });
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

  async function handleSendManual(id: string) {
    setSendingId(id);
    try {
      await apiClient.post(`/invoices/${id}/send-reminder`, {});
      toast.success("✉️ Recordatorio enviado correctamente");
      fetchInvoices();
    } catch {
      toast.error("Error al enviar el recordatorio");
    } finally {
      setSendingId(null);
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
      await apiClient.post(`/invoices/${id}/send-reminder`, {});
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
    `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-100 transition ${err ? "border-red-400 focus:border-red-400" : "border-gray-300 dark:border-slate-600 focus:border-indigo-500"}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("invoices.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("invoices.subtitle")}</p>
        </div>
        {clients.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-400">
            <span>⚠️</span>
            <span>{t("invoices.no_client_warning")}</span>
          </div>
        ) : (
          <button
            onClick={() => { setCreateOpen(true); setFormErrors({}); }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-150"
          >
            {t("invoices.new")}
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
        <span className="mt-0.5 shrink-0">ℹ️</span>
        <span>{t("invoices.info_banner")}</span>
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
                : "bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            {s === "" ? t("invoices.filter.all") : t(STATUS_LABEL_KEY[s])}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-400 dark:text-slate-500 text-center">{t("invoices.loading")}</div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-400 dark:text-slate-500 text-center">{t("invoices.empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  {["invoices.col.number","invoices.col.client","invoices.col.amount","invoices.col.due","invoices.col.status","invoices.col.reminders","invoices.col.actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {invoices.map((inv) => {
                  const isActive = inv.status === "pending" || inv.status === "overdue";
                  const isMarkingPaid = actionId === inv.id + ":paid";
                  const isToggling = actionId === inv.id + ":toggle";
                  const isSending = sendingId === inv.id;

                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const due = new Date(inv.due_date + "T00:00:00");
                  const daysSinceDue = Math.floor((today.getTime() - due.getTime()) / 86400000);
                  const intervals = inv.reminder_config.intervals ?? [3, 7, 14];
                  const nextInterval = intervals.find((d) => d > daysSinceDue);
                  const daysUntilNext = nextInterval !== undefined ? nextInterval - daysSinceDue : null;

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3 font-mono text-gray-700 dark:text-slate-300 whitespace-nowrap">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-slate-100">{inv.client.name}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-slate-100 whitespace-nowrap">
                        {inv.currency} {Number(inv.amount).toLocaleString("es")}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">{inv.due_date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
                          {t(STATUS_LABEL_KEY[inv.status])}
                        </span>
                      </td>

                      {/* Recordatorios column */}
                      <td className="px-4 py-3">
                        {inv.status === "paid" || inv.status === "cancelled" ? (
                          <span className="text-xs text-gray-400 dark:text-slate-500">—</span>
                        ) : userPlan === "free" ? (
                          <div className="flex flex-col gap-0.5">
                            <a href="/settings" className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                              <Lock className="w-3 h-3" />
                              Solo Plan Pro
                            </a>
                            <span className="text-xs text-gray-400 dark:text-slate-500">Envía manualmente</span>
                          </div>
                        ) : !inv.reminder_config.active ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                              <PauseCircle className="w-3 h-3" />
                              Pausado
                            </span>
                            <span className="text-xs text-gray-400 dark:text-slate-500">Envía manualmente cuando quieras</span>
                          </div>
                        ) : daysSinceDue < 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Automático activo
                            </span>
                            <span className="text-xs text-gray-400 dark:text-slate-500">Inicia el día 3 tras vencer</span>
                          </div>
                        ) : nextInterval !== undefined ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                              <Clock className="w-3 h-3" />
                              Próximo: Día {nextInterval}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-slate-500">en {daysUntilNext} día{daysUntilNext === 1 ? "" : "s"}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Ciclo completado</span>
                            <span className="text-xs text-gray-400 dark:text-slate-500">Emails enviados: {intervals.length}/{intervals.length}</span>
                          </div>
                        )}
                      </td>

                      {/* Acciones column */}
                      <td className="px-4 py-3">
                        {inv.status === "cancelled" ? (
                          <span className="text-xs text-gray-400 dark:text-slate-500">Cancelada</span>
                        ) : inv.status === "paid" ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {t("invoices.action.cobrada")}
                            </span>
                            <button
                              onClick={() => openDetail(inv.id)}
                              title="Ver todos los emails enviados a este cliente"
                              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 transition-all duration-150"
                            >
                              <History className="w-3.5 h-3.5" />
                              {t("invoices.action.history")}
                            </button>
                          </div>
                        ) : isActive ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={!!actionId || !!sendingId}
                              title="Marcar esta factura como pagada y detener los recordatorios"
                              className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-green-200 dark:border-green-800 transition-all duration-150 disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {isMarkingPaid ? "..." : t("invoices.action.paid")}
                            </button>
                            <button
                              onClick={() => handleSendManual(inv.id)}
                              disabled={!!actionId || !!sendingId}
                              title="Enviar un recordatorio de cobro ahora mismo a tu cliente"
                              className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all duration-150 disabled:opacity-50"
                            >
                              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {isSending ? t("invoices.sending") : t("invoices.action.send")}
                            </button>
                            {userPlan === "pro" && (
                              <button
                                onClick={() => handleToggleReminder(inv.id, inv.reminder_config.active)}
                                disabled={!!actionId || !!sendingId}
                                title={inv.reminder_config.active ? "Pausar los recordatorios automáticos para esta factura" : "Reanudar los recordatorios automáticos para esta factura"}
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-150 disabled:opacity-50 ${inv.reminder_config.active ? "bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" : "bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-600"}`}
                              >
                                {isToggling ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : inv.reminder_config.active ? (
                                  <PauseCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <PlayCircle className="w-3.5 h-3.5" />
                                )}
                                {isToggling ? "..." : inv.reminder_config.active ? t("invoices.action.pause") : t("invoices.action.resume")}
                              </button>
                            )}
                            <button
                              onClick={() => openDetail(inv.id)}
                              title="Ver todos los emails enviados a este cliente"
                              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 transition-all duration-150"
                            >
                              <History className="w-3.5 h-3.5" />
                              {t("invoices.action.history")}
                            </button>
                          </div>
                        ) : null}
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
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
              <span className="text-2xl">🚀</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{t("invoices.upgrade.title")}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              {t("invoices.upgrade.desc")}
            </p>
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-6 py-4 mb-6 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-indigo-900 dark:text-indigo-300">Plan Pro</span>
                <span className="text-xl font-bold text-indigo-700 dark:text-indigo-400">$12/mes</span>
              </div>
              <ul className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1">
                <li>✓ Facturas ilimitadas</li>
                <li>✓ Recordatorios automáticos</li>
                <li>✓ Emails generados con IA</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUpgradeOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                {t("invoices.upgrade.later")}
              </button>
              <a
                href={process.env.NEXT_PUBLIC_CHECKOUT_URL || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition text-center"
              >
                {t("invoices.upgrade.cta")}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{t("invoices.create.title")}</h2>

            <form noValidate onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("invoices.create.client")}</label>
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
                {formErrors.client_id && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.client_id}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("invoices.create.number")}</label>
                  <input
                    type="text"
                    value={form.invoice_number}
                    onChange={(e) => { setForm({ ...form, invoice_number: e.target.value }); setFormErrors((p) => ({ ...p, invoice_number: undefined })); }}
                    className={inputCls(formErrors.invoice_number)}
                    placeholder="INV-001"
                  />
                  {formErrors.invoice_number && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.invoice_number}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("invoices.create.currency")}</label>
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
                  {formErrors.currency && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.currency}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("invoices.create.amount")}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => { setForm({ ...form, amount: e.target.value }); setFormErrors((p) => ({ ...p, amount: undefined })); }}
                    className={inputCls(formErrors.amount)}
                    placeholder="1500.00"
                  />
                  {formErrors.amount && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.amount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("invoices.create.due")}</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => { setForm({ ...form, due_date: e.target.value }); setFormErrors((p) => ({ ...p, due_date: undefined })); }}
                    className={inputCls(formErrors.due_date)}
                  />
                  {formErrors.due_date && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.due_date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t("invoices.create.desc")}</label>
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
                    disabled={userPlan === "free"}
                    onClick={() => { setReminderToggleTouched(true); setForm({ ...form, reminder_active: !form.reminder_active }); }}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${userPlan === "free" || !form.reminder_active ? "bg-gray-300 dark:bg-slate-600" : "bg-indigo-600"} disabled:cursor-not-allowed`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow mt-0.5 transition-transform ${userPlan !== "free" && form.reminder_active ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    Recordatorios automáticos <span className="text-gray-400 dark:text-slate-500">(días 3, 7 y 14)</span>
                    {userPlan === "free" && <Lock className="w-3 h-3 text-gray-400 dark:text-slate-500" />}
                  </span>
                </div>
                {userPlan === "free" ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Lock className="w-3 h-3 text-gray-400 dark:text-slate-500 shrink-0" />
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Los recordatorios automáticos requieren el{" "}
                      <a href="/settings" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                        Plan Pro — $12/mes
                      </a>
                    </p>
                  </div>
                ) : reminderToggleTouched && !form.reminder_active ? (
                  <div className="mt-3 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30 p-4 flex gap-3">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      <span className="font-semibold text-yellow-800 dark:text-yellow-300">Recordatorios desactivados.</span>
                      {" "}Deberás enviar los emails de cobro manualmente desde el detalle de cada factura.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Email override — optional, collapsible */}
              <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmailConfig(!showEmailConfig)}
                  className="flex items-center gap-2 w-full text-left text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                >
                  {showEmailConfig
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }
                  Personalizar emails para esta factura
                  <span className="text-xs text-gray-400 dark:text-slate-500">(opcional — usa config del cliente por defecto)</span>
                </button>

                {showEmailConfig && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2">
                      Esta configuración sobreescribe la del cliente solo para esta factura.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Idioma</label>
                        <select
                          value={emailOverride.language}
                          onChange={(e) => setEmailOverride({ ...emailOverride, language: e.target.value })}
                          className={inputCls()}
                        >
                          <option value="es">🇪🇸 Español</option>
                          <option value="en">🇺🇸 English</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tono base</label>
                        <select
                          value={emailOverride.tone}
                          onChange={(e) => setEmailOverride({ ...emailOverride, tone: e.target.value })}
                          className={inputCls()}
                        >
                          <option value="formal">Formal</option>
                          <option value="semi-formal">Semi-formal</option>
                          <option value="casual">Casual</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tratamiento</label>
                        <select
                          value={emailOverride.treatment}
                          onChange={(e) => setEmailOverride({ ...emailOverride, treatment: e.target.value })}
                          className={inputCls()}
                        >
                          <option value="nombre">Por su nombre</option>
                          <option value="tu">De tú</option>
                          <option value="usted">De usted</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre del remitente</label>
                        <input
                          type="text"
                          value={emailOverride.sender_name}
                          onChange={(e) => setEmailOverride({ ...emailOverride, sender_name: e.target.value })}
                          className={inputCls()}
                          placeholder="Deja vacío para usar el del cliente"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Instrucciones adicionales</label>
                      <textarea
                        rows={2}
                        value={emailOverride.instructions}
                        onChange={(e) => setEmailOverride({ ...emailOverride, instructions: e.target.value })}
                        className={inputCls()}
                        maxLength={500}
                        placeholder="Ej: Menciona que el proyecto fue excelente."
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setFormErrors({}); setShowCustomCurrency(false); setReminderToggleTouched(false); setShowEmailConfig(false); setEmailOverride({ language: "es", tone: "semi-formal", treatment: "nombre", sender_name: "", instructions: "" }); }}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  {t("invoices.create.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {saving ? t("invoices.create.creating") : t("invoices.create.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {(detailInvoice || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">Cargando...</p>
            ) : detailInvoice ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Factura {detailInvoice.invoice_number}</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{detailInvoice.client.name}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[detailInvoice.status]}`}>
                    {t(STATUS_LABEL_KEY[detailInvoice.status])}
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
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${detailInvoice.reminder_config.active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"}`}>
                      {detailInvoice.reminder_config.active ? "▶ Activos" : "⏸ Pausados"}
                    </span>
                  </Dt>
                  {detailInvoice.description && <Dt label="Descripción" full>{detailInvoice.description}</Dt>}
                </dl>

                {/* Active email config */}
                {(() => {
                  const override = detailInvoice.email_config_override;
                  const cl = detailInvoice.client;
                  const config = {
                    language:     override?.language     ?? cl.email_language,
                    tone:         override?.tone         ?? cl.email_tone,
                    treatment:    override?.treatment    ?? cl.email_treatment,
                    sender_name:  override?.sender_name  ?? cl.sender_name ?? "—",
                    instructions: override?.instructions ?? cl.email_instructions,
                  };
                  const langLabel = config.language === "es" ? "🇪🇸 Español" : "🇺🇸 English";
                  return (
                    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                        Configuración de emails activa
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-400 dark:text-slate-500">Idioma:</span><span className="text-gray-700 dark:text-slate-300 ml-1">{langLabel}</span></div>
                        <div><span className="text-gray-400 dark:text-slate-500">Tono:</span><span className="text-gray-700 dark:text-slate-300 ml-1">{config.tone}</span></div>
                        <div><span className="text-gray-400 dark:text-slate-500">Tratamiento:</span><span className="text-gray-700 dark:text-slate-300 ml-1">{config.treatment}</span></div>
                        <div><span className="text-gray-400 dark:text-slate-500">Remitente:</span><span className="text-gray-700 dark:text-slate-300 ml-1">{config.sender_name}</span></div>
                        {config.instructions && (
                          <div className="col-span-2">
                            <span className="text-gray-400 dark:text-slate-500">Instrucciones:</span>
                            <span className="text-gray-700 dark:text-slate-300 ml-1">{config.instructions}</span>
                          </div>
                        )}
                        {override && (
                          <div className="col-span-2 mt-1">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                              <Info className="w-3 h-3" />
                              Config personalizada para esta factura
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(detailInvoice.status === "pending" || detailInvoice.status === "overdue") && (
                  <button
                    onClick={() => handleSendNow(detailInvoice.id)}
                    disabled={sendingReminder}
                    className="w-full mb-5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-60 transition"
                  >
                    {sendingReminder ? t("invoices.sending") : t("invoices.send_now")}
                  </button>
                )}

                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">{t("invoices.email_log.title")}</h3>
                {!detailInvoice.email_logs || detailInvoice.email_logs.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500">{t("invoices.email_log.empty")}</p>
                ) : (
                  <div className="space-y-2">
                    {detailInvoice.email_logs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-gray-200 dark:border-slate-600 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-slate-100">Día {log.reminder_day}</span>
                            <span className="text-xs text-gray-400 dark:text-slate-500">·</span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">{TONE_LABEL_KEY[log.tone] ? t(TONE_LABEL_KEY[log.tone]) : log.tone}</span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${log.status === "sent" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : log.status === "opened" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                            {log.status === "sent" ? t("emails.status.sent") : log.status === "opened" ? "Abierto" : t("emails.status.failed")}
                          </span>
                        </div>
                        <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">{new Date(log.sent_at).toLocaleString("es")}</p>
                        {log.error_message && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{log.error_message}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setDetailInvoice(null)}
                  className="mt-6 w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  {t("invoices.close")}
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
      <dt className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-gray-900 dark:text-slate-100">{children}</dd>
    </div>
  );
}
