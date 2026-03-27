"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ExternalLink } from "lucide-react";
import { apiClient } from "@/lib/api-client";

const CHECKOUT_URL = "https://payremind.lemonsqueezy.com/checkout/buy/69ade413-496f-479e-b5db-a1aa7314f163";

interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  plan: "free" | "pro";
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<UserInfo>("/auth/me")
      .then(setUser)
      .catch((err: Error) => {
        if (err.message === "Unauthorized" || err.message === "Could not validate credentials") {
          router.push("/login");
        } else {
          setError(err.message ?? "Error al cargar perfil");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
        <p className="text-sm text-gray-500 mt-1">Administra tu cuenta y suscripción</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Account section */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        <div className="px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Mi cuenta</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</p>
            <p className="mt-1 text-sm text-gray-900">{user?.full_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
            <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</p>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  user?.plan === "pro"
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
              >
                {user?.plan === "pro" ? "PRO" : "Free"}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Miembro desde</p>
            <p className="mt-1 text-sm text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString("es") : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        <div className="px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Suscripción</h2>
        </div>
        <div className="px-6 py-5">
          {user?.plan === "pro" ? (
            <div className={`rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5`}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Plan Pro activo</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Disfrutás de recordatorios ilimitados y todas las funciones premium.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <p className="text-xs text-gray-500 mb-3">
                  Para cancelar o modificar tu suscripción:
                </p>
                <a
                  href="https://app.lemonsqueezy.com/my-orders"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 shadow-sm transition-all duration-150"
                >
                  <ExternalLink className="w-4 h-4" />
                  Gestionar suscripción
                </a>
                <p className="text-xs text-gray-400 mt-2">
                  Al cancelar mantendrás el acceso Pro hasta el final del período actual.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Plan Free</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Hasta 3 facturas activas. Actualizá a Pro para desbloquear recordatorios ilimitados y acceso prioritario.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-500">
                    <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> 3 facturas activas</li>
                    <li className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Recordatorios manuales</li>
                    <li className="flex items-center gap-1.5 text-gray-400"><span>✗</span> Recordatorios automáticos</li>
                    <li className="flex items-center gap-1.5 text-gray-400"><span>✗</span> Facturas ilimitadas</li>
                  </ul>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-gray-900 mb-3">$12<span className="text-sm font-normal text-gray-500">/mes</span></p>
                  <a
                    href={CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150 whitespace-nowrap"
                  >
                    Upgrade a Pro
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
