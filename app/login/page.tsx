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

  const inputCls = (err?: string) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150 ${err ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300"}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
              <BellRing className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PayRemind</h1>
          </Link>
          <p className="text-gray-500 mt-1 text-sm">Cobros automáticos para freelancers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                className={inputCls(errors.email)}
                placeholder="tu@email.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                className={inputCls(errors.password)}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-60 transition-all duration-150"
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
