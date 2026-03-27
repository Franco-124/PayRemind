"use client";

import { useState } from "react";
import { Star, Send, CheckCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";
import { useToastContext } from "@/app/components/ui/toast-provider";

interface FeedbackForm {
  category: string;
  rating: number;
  priority: string;
  message: string;
}

const EMPTY_FORM: FeedbackForm = {
  category: "",
  rating: 0,
  priority: "",
  message: "",
};

const CATEGORIES = [
  { value: "bug",         label: "🐛 Reportar un bug",   desc: "Algo no funciona correctamente" },
  { value: "feature",     label: "✨ Nueva función",      desc: "Quiero que agreguen algo nuevo" },
  { value: "improvement", label: "🔧 Mejora",             desc: "Algo que podría funcionar mejor" },
  { value: "other",       label: "💬 Otro",               desc: "Comentario general" },
];

const RATING_LABELS: Record<number, string> = {
  1: "Muy insatisfecho",
  2: "Insatisfecho",
  3: "Neutral",
  4: "Satisfecho",
  5: "Muy satisfecho 🎉",
};

const PRIORITY_STYLES: Record<string, { selected: string; base: string }> = {
  low:    { selected: "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400",   base: "border-gray-200 text-gray-600 bg-white dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800" },
  medium: { selected: "border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400", base: "border-gray-200 text-gray-600 bg-white dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800" },
  high:   { selected: "border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-400",         base: "border-gray-200 text-gray-600 bg-white dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800" },
};

export default function FeedbackPage() {
  useRequireAuth();
  const toast = useToastContext();
  const [form, setForm] = useState<FeedbackForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FeedbackForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const errs: Partial<Record<keyof FeedbackForm, string>> = {};
    if (!form.category) errs.category = "Selecciona una categoría";
    if (form.rating === 0) errs.rating = "Selecciona una valoración";
    if (!form.priority) errs.priority = "Selecciona una prioridad";
    if (form.message.trim().length < 10) errs.message = "El mensaje debe tener al menos 10 caracteres";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await apiClient.post("/feedback/", {
        category: form.category,
        priority: form.priority,
        rating: form.rating,
        message: form.message.trim(),
      });
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch {
      toast.error("Error al enviar el feedback. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">¡Gracias por tu feedback!</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            Lo revisaremos pronto y lo tendremos en cuenta para mejorar PayRemind.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
          >
            Enviar otro feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Enviar feedback</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Tu opinión nos ayuda a mejorar PayRemind. Cuéntanos qué piensas.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-6">

        {/* Categoría */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">Categoría *</label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => { setForm({ ...form, category: cat.value }); setErrors((p) => ({ ...p, category: undefined })); }}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                  form.category === cat.value
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30"
                    : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                }`}
              >
                <div className="font-medium text-sm text-gray-900 dark:text-slate-100">{cat.label}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{cat.desc}</div>
              </button>
            ))}
          </div>
          {errors.category && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.category}</p>}
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">Valoración general *</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => { setForm({ ...form, rating: star }); setErrors((p) => ({ ...p, rating: undefined })); }}
                className="p-0.5 rounded transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= form.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-slate-600"
                  }`}
                />
              </button>
            ))}
          </div>
          {form.rating > 0 && (
            <p className="mt-1.5 text-sm text-gray-600 dark:text-slate-300 font-medium">{RATING_LABELS[form.rating]}</p>
          )}
          {errors.rating && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.rating}</p>}
        </div>

        {/* Prioridad */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">Prioridad *</label>
          <div className="flex gap-3">
            {(["low", "medium", "high"] as const).map((p) => {
              const labels = { low: "Baja", medium: "Media", high: "Alta" };
              const styles = PRIORITY_STYLES[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setForm({ ...form, priority: p }); setErrors((prev) => ({ ...prev, priority: undefined })); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-150 ${
                    form.priority === p ? styles.selected : styles.base
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
          {errors.priority && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.priority}</p>}
        </div>

        {/* Mensaje */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">Mensaje *</label>
          <textarea
            rows={5}
            value={form.message}
            onChange={(e) => { setForm({ ...form, message: e.target.value }); setErrors((p) => ({ ...p, message: undefined })); }}
            maxLength={1000}
            placeholder="Describe tu feedback con el mayor detalle posible. Si es un bug, indica qué estabas haciendo cuando ocurrió."
            className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition resize-none ${
              errors.message ? "border-red-400 focus:border-red-400" : "border-gray-300 dark:border-slate-600 focus:border-indigo-500"
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.message
              ? <p className="text-xs text-red-600 dark:text-red-400">{errors.message}</p>
              : <span />
            }
            <p className="text-xs text-gray-400 dark:text-slate-500">{form.message.length}/1000</p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm disabled:opacity-60 transition-all duration-150"
        >
          <Send className="w-4 h-4" />
          {saving ? "Enviando..." : "Enviar feedback"}
        </button>

      </form>
    </div>
  );
}
