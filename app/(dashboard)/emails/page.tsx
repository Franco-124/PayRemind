"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { apiClient } from "@/lib/api-client";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useLanguage } from "@/app/contexts/language-context";

interface EmailLog {
  id: string;
  subject: string | null;
  body: string | null;
  tone: string;
  status: string;
  sent_at: string;
  reminder_day: number;
  error_message: string | null;
  invoice: { invoice_number: string; amount: number; currency: string };
  client: { name: string; email: string };
}

const TONE_BADGE: Record<string, string> = {
  friendly: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  firm:     "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  final:    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

const STATUS_BADGE_CLS: Record<string, string> = {
  sent:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function relativeDate(iso: string) {
  const d = new Date(iso);
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

function exactDate(iso: string) {
  return format(new Date(iso), "d MMM yyyy 'a las' HH:mm", { locale: es });
}

export default function EmailsPage() {
  useRequireAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed">("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmailLog | null>(null);

  const fetchLogs = useCallback(async (status: "" | "sent" | "failed") => {
    setLoading(true);
    try {
      const url = status ? `/email-logs/?status=${status}` : "/email-logs/";
      const data = await apiClient.get<EmailLog[]>(url);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(statusFilter); }, [statusFilter, fetchLogs]);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.client.name.toLowerCase().includes(q) ||
      l.invoice.invoice_number.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("emails.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t("emails.subtitle")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden text-sm">
          {(["", "sent", "failed"] as const).map((s) => {
            const labels = { "": t("emails.filter.all"), sent: t("emails.filter.sent"), failed: t("emails.filter.failed") };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 font-medium transition ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder={t("emails.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition w-64"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 dark:text-slate-500 text-sm">
          {t("emails.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400 dark:text-slate-500">
          <Mail className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium text-gray-600 dark:text-slate-400">{t("emails.empty")}</p>
          <p className="text-sm mt-1">
            {t("emails.empty.sub")}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t("emails.col.client")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t("emails.col.invoice")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t("emails.col.subject")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t("emails.col.day")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t("emails.col.tone")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t("emails.col.status")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">{t("emails.col.sent_at")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const tone = TONE_BADGE[log.tone] ?? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400";
                const stCls = STATUS_BADGE_CLS[log.status] ?? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400";
                const stLabel = log.status === "sent" ? t("emails.status.sent") : log.status === "failed" ? t("emails.status.failed") : log.status;
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className="border-b border-gray-50 dark:border-slate-700 hover:bg-indigo-50/40 dark:hover:bg-slate-700/50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{log.client.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                      <span className="font-mono">{log.invoice.invoice_number}</span>
                      <span className="ml-1 text-gray-400 dark:text-slate-500">
                        · {log.invoice.amount} {log.invoice.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 max-w-xs truncate">
                      {log.subject ?? <span className="text-gray-300 dark:text-slate-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-slate-400">
                        Día {log.reminder_day}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
                        {log.tone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stCls}`}>
                        {stLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {relativeDate(log.sent_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t("emails.detail.title")}</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm mb-5">
              <Row label={t("emails.detail.client")} value={`${selected.client.name} · ${selected.client.email}`} />
              <Row
                label={t("emails.detail.invoice")}
                value={`${selected.invoice.invoice_number} · ${selected.invoice.amount} ${selected.invoice.currency}`}
              />
              <Row label={t("emails.detail.sent")} value={exactDate(selected.sent_at)} />
              <Row label={t("emails.detail.day")} value={`${selected.reminder_day}`} />
              <Row label={t("emails.detail.tone")} value={<span className="capitalize">{selected.tone}</span>} />
              <Row
                label={t("emails.detail.status")}
                value={
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLS[selected.status] ?? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"}`}>
                    {selected.status === "sent" ? t("emails.status.sent") : selected.status === "failed" ? t("emails.status.failed") : selected.status}
                  </span>
                }
              />
            </div>

            {selected.subject && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wide">{t("emails.detail.subject")}</p>
                <p className="text-sm text-gray-900 dark:text-slate-100">{selected.subject}</p>
              </div>
            )}

            {selected.body && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wide">{t("emails.detail.body")}</p>
                <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-4 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selected.body}
                </div>
              </div>
            )}

            {selected.error_message && (
              <div className="mb-5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
                <span className="font-medium">Error:</span> {selected.error_message}
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
              {t("emails.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-40 shrink-0 text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-gray-900 dark:text-slate-100">{value}</span>
    </div>
  );
}
