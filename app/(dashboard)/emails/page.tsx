"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { apiClient } from "@/lib/api-client";

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
  friendly: "bg-blue-100 text-blue-700",
  firm:     "bg-yellow-100 text-yellow-700",
  final:    "bg-red-100 text-red-700",
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  sent:   { cls: "bg-green-100 text-green-700", label: "Enviado" },
  failed: { cls: "bg-red-100 text-red-700",     label: "Fallido" },
};

function relativeDate(iso: string) {
  const d = new Date(iso);
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

function exactDate(iso: string) {
  return format(new Date(iso), "d MMM yyyy 'a las' HH:mm", { locale: es });
}

export default function EmailsPage() {
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emails enviados</h1>
        <p className="text-sm text-gray-500 mt-1">
          Historial completo de recordatorios enviados a tus clientes
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(["", "sent", "failed"] as const).map((s) => {
            const labels = { "": "Todos", sent: "Enviados", failed: "Fallidos" };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 font-medium transition ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Buscar cliente o factura..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition w-64"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
          <Mail className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium text-gray-600">No hay emails enviados aún.</p>
          <p className="text-sm mt-1">
            Crea una factura y activa los recordatorios automáticos para empezar.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Factura</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Asunto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Día</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tono</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Enviado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const tone = TONE_BADGE[log.tone] ?? "bg-gray-100 text-gray-600";
                const st = STATUS_BADGE[log.status] ?? { cls: "bg-gray-100 text-gray-600", label: log.status };
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className="border-b border-gray-50 hover:bg-indigo-50/40 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{log.client.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="font-mono">{log.invoice.invoice_number}</span>
                      <span className="ml-1 text-gray-400">
                        · {log.invoice.amount} {log.invoice.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {log.subject ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        Día {log.reminder_day}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
                        {log.tone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Detalle del email</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm mb-5">
              <Row label="Cliente" value={`${selected.client.name} · ${selected.client.email}`} />
              <Row
                label="Factura"
                value={`${selected.invoice.invoice_number} · ${selected.invoice.amount} ${selected.invoice.currency}`}
              />
              <Row label="Enviado" value={exactDate(selected.sent_at)} />
              <Row label="Día del recordatorio" value={`Día ${selected.reminder_day}`} />
              <Row label="Tono" value={<span className="capitalize">{selected.tone}</span>} />
              <Row
                label="Estado"
                value={
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${(STATUS_BADGE[selected.status] ?? { cls: "bg-gray-100 text-gray-600" }).cls}`}>
                    {(STATUS_BADGE[selected.status] ?? { label: selected.status }).label}
                  </span>
                }
              />
            </div>

            {selected.subject && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Asunto</p>
                <p className="text-sm text-gray-900">{selected.subject}</p>
              </div>
            )}

            {selected.body && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Cuerpo</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selected.body}
                </div>
              </div>
            )}

            {selected.error_message && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <span className="font-medium">Error:</span> {selected.error_message}
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              Cerrar
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
      <span className="w-40 shrink-0 text-gray-500">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
