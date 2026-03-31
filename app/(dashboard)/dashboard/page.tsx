"use client";

import { useEffect, useState } from "react";
import { Clock, DollarSign, AlertCircle } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useLanguage } from "@/app/contexts/language-context";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: "pending" | "overdue" | "paid" | "cancelled";
  client: { name: string };
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

export default function DashboardPage() {
  useRequireAuth();
  const { t } = useLanguage();
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("dashboard.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Free plan limit banner */}
      {showFreeLimitBanner && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 flex items-center justify-between dark:border-indigo-800 dark:bg-indigo-900/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                {t("dashboard.free_limit")}
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                {pending.length + overdue.length} {t("dashboard.free_limit_sub")}
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-150"
          >
            {t("common.upgrade")}
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label={t("dashboard.pending")}
          value={loading ? "—" : String(pending.length)}
          icon={Clock}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-50 dark:bg-indigo-900/30"
        />
        <SummaryCard
          label={t("dashboard.total_pending")}
          value={
            loading ? "—" : Object.keys(totalsByCurrency).length === 0 ? "$ 0" : (
              <div className="flex flex-col gap-0.5 mt-1">
                {Object.entries(totalsByCurrency).map(([cur, amt]) => (
                  <div key={cur} className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{cur}</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {amt.toLocaleString("es", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
          icon={DollarSign}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/30"
        />
        <SummaryCard
          label={t("dashboard.overdue")}
          value={loading ? "—" : String(overdue.length)}
          icon={AlertCircle}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-50 dark:bg-red-900/30"
          highlight={hasOverdue}
        />
      </div>

      {/* Recent invoices */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t("dashboard.recent")}</h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400 dark:text-slate-500 text-center">{t("common.loading")}</div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">{t("dashboard.no_activity")}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t("dashboard.no_activity_sub")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  {["invoices.col.number", "invoices.col.client", "invoices.col.amount", "invoices.col.due", "invoices.col.status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                      {t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {recent.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-slate-100">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{inv.client.name}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                      {inv.currency} {Number(inv.amount).toLocaleString("es")}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-slate-400">{inv.due_date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[inv.status]}`}>
                        {t(STATUS_LABEL_KEY[inv.status])}
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
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-6 ${highlight ? "border-red-200 dark:border-red-800" : "border-gray-200 dark:border-slate-700"}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-4">{label}</p>
      {typeof value === "string" ? (
        <p className={`mt-1 text-3xl font-bold ${highlight ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-slate-100"}`}>{value}</p>
      ) : (
        value
      )}
    </div>
  );
}
