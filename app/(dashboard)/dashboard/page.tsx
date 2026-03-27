"use client";

import { useEffect, useState } from "react";
import { Clock, DollarSign, AlertCircle } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: "pending" | "overdue" | "paid" | "cancelled";
  client: { name: string };
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

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    apiClient
      .get<Invoice[]>("/invoices/")
      .then(setInvoices)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    apiClient.get<{ plan: "free" | "pro" }>("/auth/me")
      .then((me) => setUserPlan(me.plan))
      .catch(() => {});
  }, []);

  const pending = invoices.filter((i) => i.status === "pending");
  const overdue = invoices.filter((i) => i.status === "overdue");

  const totalsByCurrency = [...pending, ...overdue].reduce<Record<string, number>>(
    (acc, i) => {
      acc[i.currency] = (acc[i.currency] ?? 0) + Number(i.amount);
      return acc;
    },
    {}
  );

  const recent = invoices.slice(0, 5);
  const hasOverdue = overdue.length > 0;
  const showFreeLimitBanner = userPlan === "free" && (pending.length + overdue.length) >= 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de tu actividad</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Free plan limit banner */}
      {showFreeLimitBanner && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                Has alcanzado el límite del plan Free
              </p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Tienes {pending.length + overdue.length} facturas activas. Upgrade a Pro para crear facturas ilimitadas.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-150"
          >
            Upgrade a Pro
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Facturas pendientes"
          value={loading ? "—" : String(pending.length)}
          icon={Clock}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <SummaryCard
          label="Monto total pendiente"
          value={
            loading ? "—" : Object.keys(totalsByCurrency).length === 0 ? "$ 0" : (
              <div className="flex flex-col gap-0.5 mt-1">
                {Object.entries(totalsByCurrency).map(([cur, amt]) => (
                  <div key={cur} className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{cur}</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {amt.toLocaleString("es", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <SummaryCard
          label="Facturas vencidas"
          value={loading ? "—" : String(overdue.length)}
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          highlight={hasOverdue}
        />
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Actividad reciente</h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400 text-center">Cargando...</div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin actividad reciente</h3>
            <p className="text-sm text-gray-500">Creá tu primera factura para empezar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["#", "Cliente", "Monto", "Vencimiento", "Estado"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-700">{inv.client.name}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {inv.currency} {Number(inv.amount).toLocaleString("es")}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{inv.due_date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, icon: Icon, iconColor, iconBg, highlight,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 ${highlight ? "border-red-200" : "border-gray-200"}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-4">{label}</p>
      {typeof value === "string" ? (
        <p className={`mt-1 text-3xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      ) : (
        value
      )}
    </div>
  );
}
