import type { MessageKey } from "@/lib/i18n";

/**
 * Reglas de los formularios de autenticación. Son copia de la validación de
 * Bean Validation del backend: aquí sirven para avisar antes de la llamada, no
 * para decidir nada — quien manda es el servidor.
 *
 * Cada función devuelve la clave del mensaje a mostrar, o `null` si el valor
 * está bien.
 */

const USERNAME = /^[a-zA-Z0-9._-]{3,30}$/;
// Deliberadamente simple: validar correos con una expresión regular exacta es
// un pozo sin fondo, y el backend (y el propio envío) tienen la última palabra.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function validateUsername(value: string): MessageKey | null {
  if (!value) return "auth.validation.required";
  return USERNAME.test(value) ? null : "auth.validation.username";
}

export function validateEmail(value: string): MessageKey | null {
  if (!value) return "auth.validation.required";
  return EMAIL.test(value) ? null : "auth.validation.email";
}

export function validatePassword(value: string): MessageKey | null {
  if (!value) return "auth.validation.required";
  return value.length >= MIN_PASSWORD_LENGTH ? null : "auth.validation.password";
}

export function validateMatch(
  password: string,
  confirmation: string,
): MessageKey | null {
  if (!confirmation) return "auth.validation.required";
  return password === confirmation ? null : "auth.validation.mismatch";
}

// --- Envío del pedido ---

/** Los tres topes son los `@Size` de `CreateOrderRequest` en el backend. */
export const MAX_RECIPIENT_NAME_LENGTH = 120;
export const MAX_ADDRESS_LENGTH = 200;
export const MAX_PHONE_LENGTH = 30;

function validateBounded(value: string, max: number): MessageKey | null {
  const trimmed = value.trim();
  if (!trimmed) return "checkout.validation.required";
  return trimmed.length <= max ? null : "checkout.validation.tooLong";
}

export function validateRecipientName(value: string): MessageKey | null {
  return validateBounded(value, MAX_RECIPIENT_NAME_LENGTH);
}

export function validateAddress(value: string): MessageKey | null {
  return validateBounded(value, MAX_ADDRESS_LENGTH);
}

/**
 * El teléfono solo se comprueba lleno y acotado. Un formato estricto aquí
 * rechazaría prefijos internacionales, extensiones y espacios que el backend
 * acepta sin problema: la casilla no es un validador de telefonía.
 */
export function validatePhone(value: string): MessageKey | null {
  return validateBounded(value, MAX_PHONE_LENGTH);
}
