import { cookies } from "next/headers";

/**
 * Sesión del usuario.
 *
 * El token JWT que emite Spring se guarda tal cual en una cookie `httpOnly`:
 * ya viene firmado y para el navegador es opaco, así que envolverlo en otro
 * token solo añadiría una clave más que custodiar. Al ser `httpOnly`, ningún
 * script de la página puede leerlo — que es justo lo que no ofrece
 * `localStorage`.
 */

const COOKIE_NAME = "bitacora_session";

export type Session = {
  token: string;
  /** Milisegundos desde epoch, leídos del claim `exp`. */
  expiresAt: number;
};

export async function createSession(token: string, maxAgeMs: number) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // En desarrollo el sitio va por http sin cifrar y una cookie `secure`
    // sencillamente no se guardaría.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Devuelve la sesión, o `null` si no hay cookie o el token ya caducó.
 *
 * La caducidad se mira aquí para no mandar a la API llamadas que se sabe que
 * van a fallar, y para que `/login` no rebote a `/account` con un token muerto.
 * No se verifica la firma: eso lo hace Spring, que es quien la puso.
 */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const expiresAt = expiryOf(token);
  if (expiresAt === null || expiresAt <= Date.now()) return null;

  return { token, expiresAt };
}

/** Lee el claim `exp` (en segundos) del payload del JWT. */
function expiryOf(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}
