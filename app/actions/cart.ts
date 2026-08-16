"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError, createOrder, type ApiErrorCode } from "@/lib/api";
import {
  addLine,
  CartTooLargeError,
  deleteCart,
  dropLine,
  readCart,
  sanitizeLine,
  setLineQuantity,
  writeCart,
} from "@/lib/cart";
import { defaultLocale, hasLocale, type Locale, type MessageKey } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import {
  validateAddress,
  validatePhone,
  validateRecipientName,
} from "@/lib/validation";

/**
 * Acciones del carrito y del checkout.
 *
 * Todas reciben sus datos en campos ocultos, es decir: los reciben del
 * navegador, es decir: no son de fiar. Cada una vuelve a validar lo suyo —
 * `productId` y `quantity` a entero, el precio a número finito, las cadenas
 * recortadas. Es la misma regla que ya enuncia `lib/validation.ts`: la mitad del
 * cliente es comodidad, la que decide es la del servidor. Y detrás vuelve a
 * validar la API.
 */

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** El idioma viaja en un campo oculto: la acción no conoce la ruta actual. */
function localeOf(formData: FormData): Locale {
  const value = field(formData, "locale");
  return hasLocale(value) ? value : defaultLocale;
}

/**
 * A dónde vuelve el formulario de añadir. Se comprueba que sea una ruta interna
 * de este idioma: un `returnTo` que se aceptara tal cual sería un redirector
 * abierto con la firma de este sitio.
 */
function returnToOf(formData: FormData, locale: Locale): string {
  const value = field(formData, "returnTo");
  const internal =
    value.startsWith(`/${locale}/`) && !value.startsWith(`/${locale}//`);

  return internal ? value : `/${locale}/store`;
}

/**
 * El aviso de "carrito lleno" viaja en la query.
 *
 * Un `<form>` de servidor no puede devolver estado a la página que lo pintó, y
 * el límite tiene que verse: escribir una cookie que el navegador tira en
 * silencio es exactamente el fallo que este tope existe para evitar.
 */
function withCartFlag(path: string, flag: string | null): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);

  if (flag) params.set("cart", flag);
  else params.delete("cart");

  const search = params.toString();
  return search ? `${base}?${search}` : base;
}

/** Las páginas que leen el carrito son todas dinámicas, pero el contador de la
 *  barra vive en el layout: se invalida el idioma entero. */
function refresh(locale: Locale) {
  revalidatePath(`/${locale}`, "layout");
}

function integer(formData: FormData, name: string): number | null {
  const value = Math.trunc(Number(field(formData, name)));
  return Number.isFinite(value) ? value : null;
}

export async function addToCart(formData: FormData) {
  const locale = localeOf(formData);
  const returnTo = returnToOf(formData, locale);

  const line = sanitizeLine({
    i: formData.get("productId"),
    t: formData.get("title"),
    p: formData.get("price"),
    q: 1,
    m: formData.get("image"),
  });

  // Un producto ilegible no es motivo para tocar el carrito ni para enseñar un
  // error: el formulario lo pintó esta misma app, así que solo llega aquí si
  // alguien lo reescribió a mano.
  if (!line) redirect(withCartFlag(returnTo, null));

  const result = addLine(await readCart(), line);
  if (!result.ok) redirect(withCartFlag(returnTo, "full"));

  try {
    await writeCart(result.lines);
  } catch (error) {
    if (error instanceof CartTooLargeError) redirect(withCartFlag(returnTo, "full"));
    throw error;
  }

  refresh(locale);
  redirect(withCartFlag(returnTo, null));
}

export async function setQuantity(formData: FormData) {
  const locale = localeOf(formData);
  const productId = integer(formData, "productId");
  const quantity = integer(formData, "quantity");

  if (productId !== null && productId > 0 && quantity !== null) {
    // El `0` borra la línea, que es lo que anuncia el `min` de la casilla.
    await writeCart(setLineQuantity(await readCart(), productId, quantity));
    refresh(locale);
  }

  redirect(`/${locale}/cart`);
}

export async function removeLine(formData: FormData) {
  const locale = localeOf(formData);
  const productId = integer(formData, "productId");

  if (productId !== null && productId > 0) {
    await writeCart(dropLine(await readCart(), productId));
    refresh(locale);
  }

  redirect(`/${locale}/cart`);
}

export async function clearCart(formData: FormData) {
  const locale = localeOf(formData);

  await deleteCart();
  refresh(locale);
  redirect(`/${locale}/cart`);
}

// --- Cerrar el pedido ---

export type CheckoutFormState = {
  /** Clave de mensaje por campo, para pintarla bajo la casilla. */
  fieldErrors?: Record<string, MessageKey>;
  /** Error general del formulario, ya traducido a clave de mensaje. */
  errorKey?: MessageKey;
};

/**
 * Los códigos que puede contestar la API en este flujo. Uno que no esté aquí
 * cae en la frase genérica: enseñar el código al cliente no le dice nada.
 */
const ERROR_KEYS: Partial<Record<ApiErrorCode, MessageKey>> = {
  EMPTY_CART: "checkout.error.EMPTY_CART",
  VALIDATION_ERROR: "checkout.error.VALIDATION_ERROR",
  UNAUTHENTICATED: "checkout.error.UNAUTHENTICATED",
};

function errorKeyOf(error: unknown): MessageKey {
  return error instanceof ApiError
    ? (ERROR_KEYS[error.code] ?? "checkout.error.UNEXPECTED")
    : "checkout.error.UNEXPECTED";
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

/**
 * Cierra el pedido: sesión, carrito, datos de envío, `POST /api/orders`.
 *
 * El token nunca llega al navegador — esto corre en el servidor y lee la cookie
 * ahí, como todas las acciones de `auth.ts`. La redirección lleva solo el id: la
 * pantalla de confirmación vuelve a pedir el pedido a la API, así que recargarla
 * enseña el pedido de verdad en lugar de un número de la query, y el id de un
 * extraño responde 404 en vez de pintar el recibo de otro.
 */
export async function placeOrder(
  _state: CheckoutFormState | undefined,
  formData: FormData,
): Promise<CheckoutFormState> {
  const locale = localeOf(formData);

  const session = await getSession();
  if (!session) return { errorKey: "checkout.error.UNAUTHENTICATED" };

  const lines = await readCart();
  if (lines.length === 0) return { errorKey: "checkout.error.EMPTY_CART" };

  const recipientName = field(formData, "recipientName");
  const address = field(formData, "address");
  const phone = field(formData, "phone");

  const fieldErrors = collect([
    ["recipientName", validateRecipientName(recipientName)],
    ["address", validateAddress(address)],
    ["phone", validatePhone(phone)],
  ]);
  if (fieldErrors) return { fieldErrors };

  let order;
  try {
    order = await createOrder(
      {
        items: lines.map((line) => ({
          productId: line.i,
          title: line.t,
          unitPrice: line.p,
          quantity: line.q,
          imageUrl: line.m || undefined,
        })),
        recipientName,
        address,
        phone,
        locale,
      },
      session.token,
    );
  } catch (error) {
    // Un 401 aquí es la sesión muerta entre la primera pantalla y el envío. El
    // carrito se queda como está: es otra cookie, y volver a entrar lo recupera.
    return { errorKey: errorKeyOf(error) };
  }
  if (!order) return { errorKey: "checkout.error.UNEXPECTED" };

  await deleteCart();
  refresh(locale);
  redirect(`/${locale}/checkout/success?order=${order.id}`);
}
