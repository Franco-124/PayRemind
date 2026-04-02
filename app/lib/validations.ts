export function validateEmail(email: string): string | null {
  if (!email.trim()) return "El email es requerido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email inválido";
  return null;
}

import { checkPassword } from "./password-rules";

export function validatePassword(
  password: string,
  t: (key: string) => string = (k) => k,
): string | null {
  if (!password) return t("password.error.required");
  const c = checkPassword(password);
  if (!c.minLength) return t("password.error.minLength");
  if (!c.uppercase) return t("password.error.uppercase");
  if (!c.lowercase) return t("password.error.lowercase");
  if (!c.digit)     return t("password.error.digit");
  if (!c.special)   return t("password.error.special");
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) return `El campo ${fieldName} es requerido`;
  return null;
}

export function validateAmount(amount: string): string | null {
  if (!amount.trim()) return "El monto es requerido";
  if (isNaN(Number(amount))) return "Ingresa un monto válido";
  if (Number(amount) <= 0) return "El monto debe ser mayor a 0";
  return null;
}
