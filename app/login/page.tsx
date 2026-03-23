"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToastContext } from "@/app/components/ui/toast-provider";
import { validateEmail, validatePassword } from "@/app/lib/validations";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export default function LoginPage() {
  const router = useRouter();
  const toast = useToastContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      setErrors({ email: emailErr ?? undefined, password: passErr ?? undefined });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const data = await apiClient.postForm<TokenResponse>("/auth/login", {
        username: email,
        password,
      });
      localStorage.setItem("access_token", data.access_token);
      toast.success("¡Bienvenido!");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error("Email o contraseña incorrectos");
      void msg;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
              <BellRing className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">PayRemind</h1>
          </Link>
          <p className="text-gray-600 mt-1 text-sm">Cobros automáticos para freelancers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-100 transition ${errors.email ? "border-red-400 focus:border-red-400" : "border-gray-300 focus:border-indigo-500"}`}
                placeholder="tu@email.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-100 transition ${errors.password ? "border-red-400 focus:border-red-400" : "border-gray-300 focus:border-indigo-500"}`}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60 transition"
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="text-indigo-600 font-medium hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
