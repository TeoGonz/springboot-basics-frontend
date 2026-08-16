"use server";

import { redirect } from "next/navigation";

import {
  ApiError,
  apiPost,
  type ApiErrorCode,
  type AuthResponse,
} from "@/lib/api";
import { defaultLocale, hasLocale, type MessageKey } from "@/lib/i18n";
import { createSession, deleteSession } from "@/lib/session";
import {
  validateEmail,
  validateMatch,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

/**
 * Acciones de autenticación. Corren en el servidor, así que las credenciales
 * viajan una sola vez —del formulario al proceso de Next— y el token que
 * devuelve Spring no llega nunca al navegador: se queda en la cookie.
 */

export type AuthFormState = {
  /** Clave de mensaje por campo, para pintarla bajo la casilla. */
  fieldErrors?: Record<string, MessageKey>;
  /** Error general del formulario, ya traducido a clave de mensaje. */
  errorKey?: MessageKey;
  /** Éxito sin redirección (recuperar y restablecer contraseña). */
  done?: boolean;
};

/** Los códigos de la API se traducen a claves; el texto lo pone el diccionario. */
const ERROR_KEYS: Record<ApiErrorCode, MessageKey> = {
  VALIDATION_ERROR: "auth.error.VALIDATION_ERROR",
  BAD_CREDENTIALS: "auth.error.BAD_CREDENTIALS",
  UNAUTHENTICATED: "auth.error.BAD_CREDENTIALS",
  FORBIDDEN: "auth.error.UNEXPECTED",
  USERNAME_TAKEN: "auth.error.USERNAME_TAKEN",
  EMAIL_TAKEN: "auth.error.EMAIL_TAKEN",
  INVALID_TOKEN: "auth.error.INVALID_TOKEN",
  EXPIRED_TOKEN: "auth.error.EXPIRED_TOKEN",
  // Códigos de pedidos: ninguna pantalla de autenticación los provoca, pero el
  // mapa es exhaustivo a propósito — así añadir un código a la API obliga a
  // decidir aquí qué se le enseña al usuario.
  EMPTY_CART: "auth.error.UNEXPECTED",
  ORDER_NOT_FOUND: "auth.error.UNEXPECTED",
  INVALID_STATUS_TRANSITION: "auth.error.UNEXPECTED",
  UNEXPECTED: "auth.error.UNEXPECTED",
};

function errorKeyOf(error: unknown): MessageKey {
  return error instanceof ApiError
    ? (ERROR_KEYS[error.code] ?? "auth.error.UNEXPECTED")
    : "auth.error.UNEXPECTED";
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** El idioma viaja en un campo oculto: la acción no conoce la ruta actual. */
function localeOf(formData: FormData): string {
  const value = field(formData, "locale");
  return hasLocale(value) ? value : defaultLocale;
}

function collect(
  entries: Array<[string, MessageKey | null]>,
): Record<string, MessageKey> | null {
  const errors: Record<string, MessageKey> = {};
  for (const [name, key] of entries) {
    if (key) errors[name] = key;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

export async function login(
  _state: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const username = field(formData, "username");
  const password = formData.get("password")?.toString() ?? "";

  const fieldErrors = collect([
    ["username", username ? null : "auth.validation.required"],
    ["password", password ? null : "auth.validation.required"],
  ]);
  if (fieldErrors) return { fieldErrors };

  let auth: AuthResponse | null;
  try {
    auth = await apiPost<AuthResponse>("/api/auth/login", { username, password });
  } catch (error) {
    return { errorKey: errorKeyOf(error) };
  }
  if (!auth) return { errorKey: "auth.error.UNEXPECTED" };

  await createSession(auth.accessToken, auth.expiresInMs);
  redirect(`/${locale}/account`);
}

export async function register(
  _state: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const username = field(formData, "username");
  const email = field(formData, "email");
  const password = formData.get("password")?.toString() ?? "";
  const confirmation = formData.get("confirmPassword")?.toString() ?? "";

  const fieldErrors = collect([
    ["username", validateUsername(username)],
    ["email", validateEmail(email)],
    ["password", validatePassword(password)],
    ["confirmPassword", validateMatch(password, confirmation)],
  ]);
  if (fieldErrors) return { fieldErrors };

  let auth: AuthResponse | null;
  try {
    await apiPost("/api/auth/register", { username, email, password });
    // Registrar no autentica: el alta y el acceso son dos llamadas distintas.
    // Encadenarlas aquí evita pedirle al usuario que escriba lo mismo dos veces.
    auth = await apiPost<AuthResponse>("/api/auth/login", { username, password });
  } catch (error) {
    return { errorKey: errorKeyOf(error) };
  }
  if (!auth) return { errorKey: "auth.error.UNEXPECTED" };

  await createSession(auth.accessToken, auth.expiresInMs);
  redirect(`/${locale}/account`);
}

export async function forgotPassword(
  _state: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeOf(formData);
  const email = field(formData, "email");

  const fieldErrors = collect([["email", validateEmail(email)]]);
  if (fieldErrors) return { fieldErrors };

  try {
    await apiPost("/api/auth/forgot-password", { email, locale });
  } catch (error) {
    return { errorKey: errorKeyOf(error) };
  }

  // La API contesta lo mismo exista o no la cuenta, y esta pantalla también:
  // decir "ese correo no está registrado" convertiría el formulario en un
  // buscador de usuarios.
  return { done: true };
}

export async function resetPassword(
  _state: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const token = field(formData, "token");
  const password = formData.get("password")?.toString() ?? "";
  const confirmation = formData.get("confirmPassword")?.toString() ?? "";

  if (!token) return { errorKey: "auth.error.INVALID_TOKEN" };

  const fieldErrors = collect([
    ["password", validatePassword(password)],
    ["confirmPassword", validateMatch(password, confirmation)],
  ]);
  if (fieldErrors) return { fieldErrors };

  try {
    await apiPost("/api/auth/reset-password", { token, password });
  } catch (error) {
    return { errorKey: errorKeyOf(error) };
  }

  return { done: true };
}

export async function logout(formData: FormData) {
  const locale = localeOf(formData);
  await deleteSession();
  // El token sigue siendo válido en el servidor hasta que caduque: una sesión
  // sin estado no se puede revocar. Cerrar sesión es olvidar la cookie.
  redirect(`/${locale}`);
}
