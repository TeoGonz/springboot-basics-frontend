import { cookies } from "next/headers";

/**
 * El carrito.
 *
 * No es un recurso del backend: es un borrador que pertenece a este navegador,
 * así que vive en una cookie y no llega a Spring hasta que es un pedido cerrado.
 * Eso deja la API sin un estado a medias que nadie consulta, y permite que un
 * visitante anónimo llene el carrito y solo tenga que identificarse al final.
 *
 * La cookie es `httpOnly` como la de sesión: todas las páginas que la leen se
 * renderizan en el servidor, así que el navegador no tiene ningún motivo para
 * verla. Eso no la convierte en un dato de confianza — `httpOnly` frena a los
 * scripts, no al usuario ni a un proxy—, y por eso todo lo que sale de aquí
 * vuelve a pasar por `sanitizeLine`.
 */

const COOKIE_NAME = "bitacora_cart";

/** Diez productos distintos, tope duro: ver `MAX_COOKIE_BYTES`. */
export const MAX_LINES = 10;

/** Mismo tope que el `@Max(99)` del backend. */
export const MAX_QTY = 99;

/**
 * Todos los navegadores cortan la cookie sobre los 4 KB, y la que se pasa no da
 * error: sencillamente no se guarda. Un carrito vaciado en silencio es el peor
 * fallo posible, así que se escribe con margen y se rechaza antes de llegar.
 */
export const MAX_COOKIE_BYTES = 3500;

const MAX_TITLE_LENGTH = 60;
const MAX_IMAGE_LENGTH = 160;
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Una línea del carrito.
 *
 * Es una copia del producto, no su id: el catálogo es un sandbox que cualquiera
 * puede reescribir, y un carrito que lo releyera cambiaría sus propios precios
 * entre la rejilla y el checkout. Son los mismos cinco campos que `order_item`
 * congela en el backend, por el mismo motivo.
 *
 * Los nombres son de una letra a propósito. No es optimización prematura: es la
 * diferencia entre que quepan seis productos o diez.
 */
export type CartLine = {
  /** productId */
  i: number;
  /** título, recortado a 60 */
  t: string;
  /** precio unitario en el momento de añadirlo */
  p: number;
  /** cantidad, 1..99 */
  q: number;
  /** URL de la imagen, recortada a 160; "" cuando no había ninguna utilizable */
  m: string;
};

/** El carrito no cabe en la cookie. La acción lo traduce a un mensaje. */
export class CartTooLargeError extends Error {
  constructor() {
    super("El carrito no cabe en la cookie");
    this.name = "CartTooLargeError";
  }
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Convierte cualquier cosa en una línea válida, o en `null`.
 *
 * Lo usan los dos extremos: lo que llega de la cookie y lo que llega de un campo
 * oculto del formulario. Los dos vienen del navegador, así que ninguno es de
 * fiar.
 */
export function sanitizeLine(raw: unknown): CartLine | null {
  if (!raw || typeof raw !== "object") return null;

  const line = raw as Record<string, unknown>;

  const id = Number(line.i);
  if (!Number.isInteger(id) || id <= 0) return null;

  const title = typeof line.t === "string" ? line.t.trim().slice(0, MAX_TITLE_LENGTH) : "";
  if (!title) return null;

  const price = Number(line.p);
  if (!Number.isFinite(price) || price < 0) return null;

  const quantity = Math.trunc(Number(line.q));
  if (!Number.isFinite(quantity) || quantity < 1) return null;

  const image = typeof line.m === "string" ? line.m.trim() : "";

  return {
    i: id,
    t: title,
    p: money(price),
    q: Math.min(quantity, MAX_QTY),
    // Lo que no sea una URL http se guarda como hueco, igual que hace
    // `safeImage` con el catálogo.
    m: /^https?:\/\//i.test(image) ? image.slice(0, MAX_IMAGE_LENGTH) : "",
  };
}

/**
 * El carrito guardado. Nunca lanza: una cookie editada a mano, una escritura
 * cortada o una forma de una versión anterior se leen como carrito vacío. La
 * alternativa es una página que revienta y que no se puede recuperar sin borrar
 * cookies a mano.
 */
export async function readCart(): Promise<CartLine[]> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const lines: CartLine[] = [];
  for (const entry of parsed) {
    const line = sanitizeLine(entry);
    if (line && !lines.some((existing) => existing.i === line.i)) lines.push(line);
    if (lines.length === MAX_LINES) break;
  }

  return lines;
}

export async function writeCart(lines: CartLine[]): Promise<void> {
  const cookieStore = await cookies();

  if (lines.length === 0) {
    cookieStore.delete(COOKIE_NAME);
    return;
  }

  const value = JSON.stringify(lines);
  if (Buffer.byteLength(value, "utf8") > MAX_COOKIE_BYTES) throw new CartTooLargeError();

  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    // En desarrollo el sitio va por http y una cookie `secure` no se guardaría.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function deleteCart(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Número de líneas, no suma de cantidades: es el mismo `itemCount` de la API. */
export function cartCount(lines: CartLine[]): number {
  return lines.length;
}

export function cartTotal(lines: CartLine[]): number {
  return money(lines.reduce((total, line) => total + line.p * line.q, 0));
}

/**
 * Añade o incrementa.
 *
 * Un producto que ya está en el carrito sube de cantidad; no se abre una segunda
 * línea y **no** se refresca su precio. El precio que vio el cliente es el
 * precio que se le cobra.
 */
export function addLine(
  lines: CartLine[],
  line: CartLine,
): { ok: true; lines: CartLine[] } | { ok: false } {
  const existing = lines.find((current) => current.i === line.i);

  if (existing) {
    return {
      ok: true,
      lines: lines.map((current) =>
        current.i === line.i
          ? { ...current, q: Math.min(current.q + line.q, MAX_QTY) }
          : current,
      ),
    };
  }

  if (lines.length >= MAX_LINES) return { ok: false };

  return { ok: true, lines: [...lines, line] };
}

/** Cantidad nueva, recortada a 1..99. El `0` borra la línea. */
export function setLineQuantity(
  lines: CartLine[],
  productId: number,
  quantity: number,
): CartLine[] {
  if (quantity <= 0) return dropLine(lines, productId);

  return lines.map((line) =>
    line.i === productId ? { ...line, q: Math.min(quantity, MAX_QTY) } : line,
  );
}

export function dropLine(lines: CartLine[], productId: number): CartLine[] {
  return lines.filter((line) => line.i !== productId);
}
