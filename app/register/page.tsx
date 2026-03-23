"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToastContext } from "@/app/components/ui/toast-provider";
import { validateEmail, validatePassword, validateRequired } from "@/app/lib/validations";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToastContext();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameErr = validateRequired(fullName, "nombre");
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (nameErr || emailErr || passErr) {
      setErrors({ fullName: nameErr ?? undefined, email: emailErr ?? undefined, password: passErr ?? undefined });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const data = await apiClient.post<TokenResponse>("/auth/register", {
        full_name: fullName,
        email,
        password,
      });
      localStorage.setItem("access_token", data.access_token);
      toast.success("¡Cuenta creada!");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("existe") || msg.toLowerCase().includes("registered")) {
        toast.error("Este email ya está registrado");
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        toast.error("Error de conexión, intenta de nuevo");
      } else {
        toast.error("Error al crear la cuenta");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (err?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-100 transition ${err ? "border-red-400 focus:border-red-400" : "border-gray-300 focus:border-indigo-500"}`;

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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Crear cuenta</h2>

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
                className={inputCls(errors.fullName)}
                placeholder="Johan Franco"
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
            </div>

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
                className={inputCls(errors.email)}
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                className={inputCls(errors.password)}
                placeholder="Mínimo 8 caracteres"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-60 transition"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
