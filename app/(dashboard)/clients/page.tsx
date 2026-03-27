"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
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

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

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
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150 ${err ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300"}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los contactos a quienes facturás</p>
        </div>
        <button
          onClick={() => { setModalOpen(true); setErrors({}); }}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-150"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400 text-center">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin clientes aún</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Creá tu primer cliente para poder emitir facturas y enviar recordatorios.
            </p>
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
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold select-none">
                          {getInitials(c.name)}
                        </div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{c.email}</td>
                    <td className="px-6 py-4 text-gray-500">{c.company ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("es")}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deletingId === c.id}
                        className="inline-flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
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
                className="flex-1 inline-flex justify-center items-center bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm transition-all duration-150"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-all duration-150"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo cliente</h2>
              <button
                onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); setErrors({}); }}
                className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form noValidate onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className={inputCls()}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
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
                  className="flex-1 inline-flex justify-center items-center bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm transition-all duration-150"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-60 transition-all duration-150"
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
