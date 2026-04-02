"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Check, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToastContext } from "@/app/components/ui/toast-provider";
import { validateEmail, validatePassword, validateRequired } from "@/app/lib/validations";
import { checkPassword, type PasswordCheck } from "@/app/lib/password-rules";
import { useLanguage } from "@/app/contexts/language-context";
import { LanguageToggle } from "@/app/components/ui/language-toggle";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

function passwordStrengthScore(c: PasswordCheck): number {
  return [c.minLength, c.uppercase, c.lowercase, c.digit, c.special].filter(Boolean).length;
}

function PasswordStrengthBar({ password, t }: { password: string; t: (k: string) => string }) {
  if (!password) return null;

  const c = checkPassword(password);
  const score = passwordStrengthScore(c);

  const bars = [
    { min: 1, color: "bg-red-500" },
    { min: 2, color: "bg-orange-400" },
    { min: 3, color: "bg-yellow-400" },
    { min: 4, color: "bg-blue-500" },
    { min: 5, color: "bg-green-500" },
  ];

  const strengthLabel = [
    t("password.strength.weak"),
    t("password.strength.weak"),
    t("password.strength.fair"),
    t("password.strength.good"),
    t("password.strength.strong"),
  ][score - 1] ?? "";

  const rules: Array<{ key: keyof PasswordCheck; label: string }> = [
    { key: "minLength", label: t("password.rule.minLength") },
    { key: "uppercase", label: t("password.rule.uppercase") },
    { key: "lowercase", label: t("password.rule.lowercase") },
    { key: "digit",     label: t("password.rule.digit") },
    { key: "special",   label: t("password.rule.special") },
  ];

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                score >= bar.min ? bar.color : "bg-gray-200 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>
        {score > 0 && (
          <span className="text-xs text-gray-500 dark:text-slate-400 w-14 text-right shrink-0">
            {strengthLabel}
          </span>
        )}
      </div>

      {/* Checklist */}
      <ul className="space-y-0.5">
        {rules.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-1.5 text-xs">
            {c[key] ? (
              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 shrink-0" />
            )}
            <span className={c[key] ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-400"}>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToastContext();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showStrength, setShowStrength] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameErr = validateRequired(fullName, "nombre");
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password, t);
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
      toast.success(t("auth.register.title"));
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
    `w-full rounded-lg border bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150 ${err ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300 dark:border-slate-600"}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
              <BellRing className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">PayRemind</h1>
          </Link>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Cobros automáticos para freelancers</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">{t("auth.register.title")}</h2>

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                {t("auth.register.name")}
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
                className={inputCls(errors.fullName)}
                placeholder="Jhon Doe"
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                {t("auth.register.email")}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                className={inputCls(errors.email)}
                placeholder="example@email.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                {t("auth.register.password")}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onFocus={() => setShowStrength(true)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined }));
                }}
                className={inputCls(errors.password)}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
              {showStrength && <PasswordStrengthBar password={password} t={t} />}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-60 transition-all duration-150"
            >
              {loading ? "..." : t("auth.register.submit")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
            {t("auth.register.has_account")}{" "}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
              {t("auth.register.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
