/**
 * Canonical password spec — single source of truth for all validation.
 * Both frontend (validations.ts) and backend (schemas/user.py) derive
 * their rules from this definition.
 */

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  patterns: {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    digit:     /[0-9]/,
    special:   /[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/`~\\]/,
  },
} as const;

export interface PasswordCheck {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  digit:     boolean;
  special:   boolean;
}

export function checkPassword(password: string): PasswordCheck {
  return {
    minLength: password.length >= PASSWORD_RULES.MIN_LENGTH,
    uppercase: PASSWORD_RULES.patterns.uppercase.test(password),
    lowercase: PASSWORD_RULES.patterns.lowercase.test(password),
    digit:     PASSWORD_RULES.patterns.digit.test(password),
    special:   PASSWORD_RULES.patterns.special.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const c = checkPassword(password);
  return c.minLength && c.uppercase && c.lowercase && c.digit && c.special;
}
