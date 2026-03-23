"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Account section */}
      <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Mi cuenta</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Nombre</p>
            <p className="mt-0.5 text-sm text-gray-900">{user?.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
            <p className="mt-0.5 text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Plan</p>
            <div className="mt-1">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  user?.plan === "pro"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {user?.plan === "pro" ? "Pro" : "Free"}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Miembro desde</p>
            <p className="mt-0.5 text-sm text-gray-900">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("es")
                : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Suscripción</h2>
        </div>
        <div className="px-6 py-5">
          {user?.plan === "pro" ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 font-bold text-sm">
                ✓
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Plan Pro activo</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Disfrutás de recordatorios ilimitados y todas las funciones premium.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Plan Free</p>
                <p className="text-xs text-gray-500 mt-1">
                  Actualizá a Pro para desbloquear recordatorios ilimitados y acceso prioritario.
                </p>
              </div>
              <a
                href={CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                Upgrade a Pro — $12/mes
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
