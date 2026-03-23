"use client";

import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { Toast } from "@/app/hooks/useToast";

const STYLES = {
  success: {
    container: "bg-green-50 border-green-200 text-green-800",
    icon: CheckCircle,
    iconCls: "text-green-500",
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: XCircle,
    iconCls: "text-red-500",
  },
  warning: {
    container: "bg-yellow-50 border-yellow-200 text-yellow-800",
    icon: AlertCircle,
    iconCls: "text-yellow-500",
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: Info,
    iconCls: "text-blue-500",
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const { container, icon: Icon, iconCls } = STYLES[toast.type];
  return (
    <div
      className={`flex items-start gap-3 w-80 rounded-xl border px-4 py-3 shadow-lg animate-slide-in ${container}`}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconCls}`} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}
