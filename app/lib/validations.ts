export function validateEmail(email: string): string | null {
  if (!email.trim()) return "El email es requerido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email inválido";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "La contraseña es requerida";
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
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
