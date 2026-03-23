"use client";

import { useEffect, useState } from "react";
import { Clock, DollarSign, AlertCircle } from "lucide-react";
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
  pending: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<Invoice[]>("/invoices/")
      .then(setInvoices)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const pending = invoices.filter((i) => i.status === "pending");
  const overdue = invoices.filter((i) => i.status === "overdue");

  // Group totals by currency — never mix amounts from different currencies
  const totalsByCurrency = [...pending, ...overdue].reduce<Record<string, number>>(
    (acc, i) => {
      acc[i.currency] = (acc[i.currency] ?? 0) + Number(i.amount);
      return acc;
    },
    {}
  );

  const recent = invoices.slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Facturas pendientes"
          value={loading ? "—" : String(pending.length)}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-50"
        />
        <SummaryCard
          label="Monto total pendiente"
          value={
            loading ? (
              <span className="text-2xl font-bold text-gray-900">—</span>
            ) : Object.keys(totalsByCurrency).length === 0 ? (
              <span className="text-2xl font-bold text-gray-900">$ 0</span>
            ) : (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {Object.entries(totalsByCurrency).map(([cur, amt]) => (
                  <div key={cur} className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{cur}</span>
                    <span className="text-xl font-bold text-gray-900">
                      {amt.toLocaleString("es", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
          icon={DollarSign}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <SummaryCard
          label="Facturas vencidas"
          value={loading ? "—" : String(overdue.length)}
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Recent invoices table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Últimas facturas</h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-sm text-gray-400 text-center">Cargando...</div>
        ) : recent.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-400 text-center">No hay facturas aún.</div>
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
                    <td className="px-6 py-3 font-medium text-gray-900 font-mono">{inv.invoice_number}</td>
                    <td className="px-6 py-3 text-gray-700">{inv.client.name}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {inv.currency} {Number(inv.amount).toLocaleString("es")}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{inv.due_date}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
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
  label, value, icon: Icon, iconColor, iconBg,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        {typeof value === "string" ? (
          <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
