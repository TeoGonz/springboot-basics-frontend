/**
 * Cliente de la API de Spring. Solo se usa desde el servidor (Server Actions y
 * componentes de servidor): por eso la URL base no lleva prefijo NEXT_PUBLIC_ y
 * el navegador nunca sabe dónde vive el backend.
 */

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

/** Códigos que devuelve la API en el campo `error`. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "USERNAME_TAKEN"
  | "EMAIL_TAKEN"
  | "INVALID_TOKEN"
  | "EXPIRED_TOKEN"
  | "UNEXPECTED";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly fields?: Record<string, string>,
  ) {
    super(`${status} ${code}`);
    this.name = "ApiError";
  }
}

type ErrorBody = {
  status?: number;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

async function request<T>(
  path: string,
  init: RequestInit & { token?: string },
): Promise<T | null> {
  const { token, ...rest } = init;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
      // Nada de esto se cachea: son credenciales y datos de sesión.
      cache: "no-store",
    });
  } catch {
    // La API no responde (apagada, puerto equivocado). Para quien llama es un
    // fallo más, con el mismo código que cualquier otro imprevisto.
    throw new ApiError(0, "UNEXPECTED");
  }

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body ?? {}) as ErrorBody;
    throw new ApiError(
      response.status,
      (error.error as ApiErrorCode) ?? "UNEXPECTED",
      error.fields,
    );
  }

  return body as T;
}

export function apiPost<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T | null> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body), token });
}

export function apiGet<T>(path: string, token?: string): Promise<T | null> {
  return request<T>(path, { method: "GET", token });
}

// --- Formas que devuelve la API ---

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  username: string;
  roles: string[];
};

export type MeResponse = {
  username: string;
  enabled: boolean;
  roles: string[];
};

export type UserResponse = {
  id: number;
  username: string;
  email: string;
  roles: string[];
};
