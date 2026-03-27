"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToastContext } from "@/app/components/ui/toast-provider";

const ADMIN_EMAIL = "johan.franco@nousware.ai";

interface FeedbackUser {
  id: string;
  email: string;
  full_name: string;
  plan: string;
}

interface FeedbackItem {
  id: string;
  category: string;
  priority: string;
  rating: number;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user: FeedbackUser;
}

const CATEGORY_STYLES: Record<string, { label: string; cls: string }> = {
  bug:         { label: "🐛 Bug",     cls: "bg-red-50 text-red-700 border border-red-200" },
  feature:     { label: "✨ Feature", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  improvement: { label: "🔧 Mejora",  cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  other:       { label: "💬 Otro",    cls: "bg-gray-100 text-gray-600 border border-gray-200" },
};

const PRIORITY_STYLES: Record<string, string> = {
  high:   "bg-red-50 text-red-700 border border-red-200",
  medium: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  low:    "bg-green-50 text-green-700 border border-green-200",
};

const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-gray-100 text-gray-600",
  reviewed:    "bg-blue-50 text-blue-700",
  in_progress: "bg-yellow-50 text-yellow-700",
  done:        "bg-green-50 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending:     "Pendiente",
  reviewed:    "En revisión",
  in_progress: "En progreso",
  done:        "Resuelto ✓",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "reviewed", label: "En revisión" },
  { value: "in_progress", label: "En progreso" },
  { value: "done", label: "Resuelto" },
];

export default function AdminPage() {
  const router = useRouter();
  const toast = useToastContext();

  const [authorized, setAuthorized] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.sub !== ADMIN_EMAIL) {
        router.replace("/dashboard");
        return;
      }
      setAuthorized(true);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    fetchFeedbacks();
  }, [authorized, statusFilter]);

  async function fetchFeedbacks() {
    setLoading(true);
    try {
      const url = statusFilter ? `/feedback/admin?status=${statusFilter}` : "/feedback/admin";
      const data = await apiClient.get<FeedbackItem[]>(url);
      setFeedbacks(data);
    } catch {
      toast.error("Error al cargar feedbacks");
    } finally {
      setLoading(false);
    }
  }

  function openDetail(fb: FeedbackItem) {
    setSelectedFeedback(fb);
    setEditStatus(fb.status);
    setEditNotes(fb.admin_notes ?? "");
  }

  async function handleSave() {
    if (!selectedFeedback) return;
    setSaving(true);
    try {
      const updated = await apiClient.patch<FeedbackItem>(`/feedback/admin/${selectedFeedback.id}`, {
        status: editStatus,
        admin_notes: editNotes || null,
      });
      setFeedbacks((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setSelectedFeedback(updated);
      toast.success("Feedback actualizado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = feedbacks.filter((f) => f.status === "pending").length;

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Panel de Admin — Feedback
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {feedbacks.length} entradas totales
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              statusFilter === opt.value
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">Cargando...</div>
        ) : feedbacks.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">No hay feedbacks para este filtro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Usuario", "Categoría", "Prioridad", "Rating", "Mensaje", "Fecha", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feedbacks.map((fb) => (
                  <tr key={fb.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      <div className="font-medium text-gray-900">{fb.user.full_name}</div>
                      <div className="text-gray-400">{fb.user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[fb.category]?.cls ?? ""}`}>
                        {CATEGORY_STYLES[fb.category]?.label ?? fb.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[fb.priority] ?? ""}`}>
                        {PRIORITY_LABELS[fb.priority] ?? fb.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= fb.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <span title={fb.message}>
                        {fb.message.length > 80 ? fb.message.slice(0, 80) + "…" : fb.message}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(fb.created_at).toLocaleDateString("es")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[fb.status] ?? ""}`}>
                        {STATUS_LABELS[fb.status] ?? fb.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(fb)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium transition whitespace-nowrap"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detalle de feedback</h2>
                <p className="text-sm text-gray-500">{selectedFeedback.user.full_name} · {selectedFeedback.user.email}</p>
              </div>
              <button onClick={() => setSelectedFeedback(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Info row */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[selectedFeedback.category]?.cls ?? ""}`}>
                {CATEGORY_STYLES[selectedFeedback.category]?.label ?? selectedFeedback.category}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[selectedFeedback.priority] ?? ""}`}>
                {PRIORITY_LABELS[selectedFeedback.priority] ?? selectedFeedback.priority}
              </span>
              <div className="flex gap-0.5 items-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= selectedFeedback.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                ))}
              </div>
              <span className="text-xs text-gray-400">{new Date(selectedFeedback.created_at).toLocaleDateString("es")}</span>
            </div>

            {/* Message */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selectedFeedback.message}
            </div>

            {/* Update form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition"
                >
                  <option value="pending">Pendiente</option>
                  <option value="reviewed">En revisión</option>
                  <option value="in_progress">En progreso</option>
                  <option value="done">Resuelto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition resize-none"
                  placeholder="Notas internas (no visibles al usuario)"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
