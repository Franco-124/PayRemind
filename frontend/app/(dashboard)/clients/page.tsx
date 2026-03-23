"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  notes: string | null;
  created_at: string;
}

interface CreateClientForm {
  name: string;
  email: string;
  company: string;
  notes: string;
}

const EMPTY_FORM: CreateClientForm = { name: "", email: "", company: "", notes: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateClientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function fetchClients() {
    try {
      const data = await apiClient.get<Client[]>("/clients/");
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClients(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await apiClient.post("/clients/", {
        name: form.name,
        email: form.email,
        company: form.company || null,
        notes: form.notes || null,
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      flash("Cliente creado correctamente");
      fetchClients();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al crear cliente");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/clients/${id}`);
      flash("Cliente eliminado");
      fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => { setModalOpen(true); setFormError(""); }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          + Nuevo cliente
        </button>
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">
            No hay clientes aún. ¡Creá el primero!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Nombre", "Email", "Empresa", "Creado", "Acciones"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-3 text-gray-600">{c.email}</td>
                    <td className="px-6 py-3 text-gray-600">{c.company ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("es")}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deletingId === c.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50 transition"
                      >
                        {deletingId === c.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo cliente</h2>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Nombre *" required>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls} placeholder="Empresa ABC"
                />
              </Field>
              <Field label="Email *" required>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls} placeholder="contacto@empresa.com"
                />
              </Field>
              <Field label="Empresa">
                <input
                  type="text" value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className={inputCls} placeholder="Opcional"
                />
              </Field>
              <Field label="Notas">
                <textarea
                  rows={3} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputCls} placeholder="Opcional"
                />
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {saving ? "Guardando..." : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition";

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  void required;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
