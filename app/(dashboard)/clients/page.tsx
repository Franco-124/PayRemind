"use client";

import { useEffect, useState } from "react";
import { Users, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToastContext } from "@/app/components/ui/toast-provider";
import { validateEmail, validateRequired } from "@/app/lib/validations";
import { useRequireAuth } from "@/app/hooks/useRequireAuth";

interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  notes: string | null;
  email_language: string;
  email_tone: string;
  email_treatment: string;
  sender_name: string | null;
  email_instructions: string | null;
  created_at: string;
}

interface ClientForm {
  name: string;
  email: string;
  company: string;
  notes: string;
  email_language: string;
  email_tone: string;
  email_treatment: string;
  sender_name: string;
  email_instructions: string;
}

const EMPTY_FORM: ClientForm = {
  name: "",
  email: "",
  company: "",
  notes: "",
  email_language: "es",
  email_tone: "semi-formal",
  email_treatment: "nombre",
  sender_name: "",
  email_instructions: "",
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function EmailConfigSection({
  form,
  setForm,
  inputCls,
  open,
  setOpen,
}: {
  form: ClientForm;
  setForm: (f: ClientForm) => void;
  inputCls: (err?: string) => string;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <div className="border-t border-gray-200 pt-4 mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left text-sm font-semibold text-gray-900 mb-1"
      >
        <Mail className="w-4 h-4 text-indigo-600" />
        Configuración de emails
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
          : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
        }
      </button>

      {!open && (
        <p className="text-xs text-gray-400">
          Personaliza el idioma, tono y estilo de los emails enviados a este cliente.
        </p>
      )}

      {open && (
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
              <select
                value={form.email_language}
                onChange={(e) => setForm({ ...form, email_language: e.target.value })}
                className={inputCls()}
              >
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tono base</label>
              <select
                value={form.email_tone}
                onChange={(e) => setForm({ ...form, email_tone: e.target.value })}
                className={inputCls()}
              >
                <option value="formal">Formal — "Estimado cliente"</option>
                <option value="semi-formal">Semi-formal — "Hola [nombre]"</option>
                <option value="casual">Casual — "Hey [nombre]!"</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
              <select
                value={form.email_treatment}
                onChange={(e) => setForm({ ...form, email_treatment: e.target.value })}
                className={inputCls()}
              >
                <option value="nombre">Por su nombre</option>
                <option value="tu">De tú</option>
                <option value="usted">De usted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del remitente</label>
              <input
                type="text"
                value={form.sender_name}
                onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
                className={inputCls()}
                placeholder="Deja vacío para usar tu nombre"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instrucciones para la IA
            </label>
            <textarea
              rows={3}
              value={form.email_instructions}
              onChange={(e) => setForm({ ...form, email_instructions: e.target.value })}
              className={inputCls()}
              maxLength={500}
              placeholder="Ej: Menciona siempre que el proyecto fue completado con éxito. No uses palabras como 'urgente'."
            />
            <p className="text-xs text-gray-400 mt-1">
              Máximo 500 caracteres. Se aplica a todos los emails enviados a este cliente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  useRequireAuth();
  const toast = useToastContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ClientForm>(EMPTY_FORM);
  const [createErrors, setCreateErrors] = useState<{ name?: string; email?: string }>({});
  const [createEmailConfigOpen, setCreateEmailConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState<ClientForm>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<{ name?: string; email?: string }>({});
  const [editEmailConfigOpen, setEditEmailConfigOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

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

  function buildBody(form: ClientForm) {
    return {
      name: form.name,
      email: form.email,
      company: form.company || null,
      notes: form.notes || null,
      email_language: form.email_language,
      email_tone: form.email_tone,
      email_treatment: form.email_treatment,
      sender_name: form.sender_name || null,
      email_instructions: form.email_instructions || null,
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nameErr = validateRequired(createForm.name, "nombre");
    const emailErr = validateEmail(createForm.email);
    if (nameErr || emailErr) {
      setCreateErrors({ name: nameErr ?? undefined, email: emailErr ?? undefined });
      return;
    }
    setCreateErrors({});
    setSaving(true);
    try {
      await apiClient.post("/clients/", buildBody(createForm));
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      setCreateEmailConfigOpen(false);
      toast.success("Cliente creado correctamente");
      fetchClients();
    } catch {
      toast.error("Error al crear el cliente");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(client: Client) {
    setEditClient(client);
    setEditForm({
      name: client.name,
      email: client.email,
      company: client.company ?? "",
      notes: client.notes ?? "",
      email_language: client.email_language,
      email_tone: client.email_tone,
      email_treatment: client.email_treatment,
      sender_name: client.sender_name ?? "",
      email_instructions: client.email_instructions ?? "",
    });
    setEditErrors({});
    setEditEmailConfigOpen(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editClient) return;
    const nameErr = validateRequired(editForm.name, "nombre");
    const emailErr = validateEmail(editForm.email);
    if (nameErr || emailErr) {
      setEditErrors({ name: nameErr ?? undefined, email: emailErr ?? undefined });
      return;
    }
    setEditErrors({});
    setEditSaving(true);
    try {
      await apiClient.put(`/clients/${editClient.id}`, buildBody(editForm));
      setEditClient(null);
      toast.success("Cliente actualizado correctamente");
      fetchClients();
    } catch {
      toast.error("Error al actualizar el cliente");
    } finally {
      setEditSaving(false);
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
          onClick={() => { setCreateOpen(true); setCreateErrors({}); setCreateEmailConfigOpen(false); }}
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={deletingId === c.id}
                          className="inline-flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50"
                        >
                          {deletingId === c.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
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
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo cliente</h2>
              <button
                onClick={() => { setCreateOpen(false); setCreateForm(EMPTY_FORM); setCreateErrors({}); }}
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
                  value={createForm.name}
                  onChange={(e) => { setCreateForm({ ...createForm, name: e.target.value }); setCreateErrors((p) => ({ ...p, name: undefined })); }}
                  className={inputCls(createErrors.name)}
                  placeholder="Empresa ABC"
                />
                {createErrors.name && <p className="mt-1 text-xs text-red-600">{createErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => { setCreateForm({ ...createForm, email: e.target.value }); setCreateErrors((p) => ({ ...p, email: undefined })); }}
                  className={inputCls(createErrors.email)}
                  placeholder="contacto@empresa.com"
                />
                {createErrors.email && <p className="mt-1 text-xs text-red-600">{createErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
                <input
                  type="text"
                  value={createForm.company}
                  onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                  className={inputCls()}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className={inputCls()}
                  placeholder="Opcional"
                />
              </div>

              <EmailConfigSection
                form={createForm}
                setForm={setCreateForm}
                inputCls={inputCls}
                open={createEmailConfigOpen}
                setOpen={setCreateEmailConfigOpen}
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCreateOpen(false); setCreateForm(EMPTY_FORM); setCreateErrors({}); }}
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

      {/* Edit Modal */}
      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Editar cliente</h2>
              <button
                onClick={() => setEditClient(null)}
                className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form noValidate onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => { setEditForm({ ...editForm, name: e.target.value }); setEditErrors((p) => ({ ...p, name: undefined })); }}
                  className={inputCls(editErrors.name)}
                />
                {editErrors.name && <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); setEditErrors((p) => ({ ...p, email: undefined })); }}
                  className={inputCls(editErrors.email)}
                />
                {editErrors.email && <p className="mt-1 text-xs text-red-600">{editErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  className={inputCls()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className={inputCls()}
                />
              </div>

              <EmailConfigSection
                form={editForm}
                setForm={setEditForm}
                inputCls={inputCls}
                open={editEmailConfigOpen}
                setOpen={setEditEmailConfigOpen}
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditClient(null)}
                  className="flex-1 inline-flex justify-center items-center bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm transition-all duration-150"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 inline-flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-60 transition-all duration-150"
                >
                  {editSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
