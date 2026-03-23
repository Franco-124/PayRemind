"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useToastContext } from "@/app/components/ui/toast-provider";
import { validateEmail, validateRequired } from "@/app/lib/validations";

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
  const toast = useToastContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateClientForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  async function fetchClients() {
    try {
      const data = await apiClient.get<Client[]>("/clients/");
      setClients(data);
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClients(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nameErr = validateRequired(form.name, "nombre");
    const emailErr = validateEmail(form.email);
    if (nameErr || emailErr) {
      setErrors({ name: nameErr ?? undefined, email: emailErr ?? undefined });
      return;
    }
    setErrors({});
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
      toast.success("Cliente creado correctamente");
      fetchClients();
    } catch {
      toast.error("Error al crear el cliente");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    setConfirmDelete({ id, name });
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(id);
    try {
      await apiClient.delete(`/clients/${id}`);
      toast.success("Cliente eliminado");
      fetchClients();
    } catch {
      toast.error("Error al eliminar el cliente");
    } finally {
      setDeletingId(null);
    }
  }

  const inputCls = (err?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-100 transition ${err ? "border-red-400 focus:border-red-400" : "border-gray-300 focus:border-indigo-500"}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => { setModalOpen(true); setErrors({}); }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          + Nuevo cliente
        </button>
      </div>

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

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <span className="text-xl">🗑️</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">¿Eliminar cliente?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Vas a eliminar a <strong>{confirmDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo cliente</h2>

            <form noValidate onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((p) => ({ ...p, name: undefined })); }}
                  className={inputCls(errors.name)}
                  placeholder="Empresa ABC"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors((p) => ({ ...p, email: undefined })); }}
                  className={inputCls(errors.email)}
                  placeholder="contacto@empresa.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className={inputCls()}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputCls()}
                  placeholder="Opcional"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); setErrors({}); }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
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
