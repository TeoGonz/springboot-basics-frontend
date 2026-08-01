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
