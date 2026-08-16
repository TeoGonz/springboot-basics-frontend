"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError, updateOrderStatus, type OrderStatus } from "@/lib/api";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

/**
 * Mover un pedido de estado, desde la tabla de administración.
 *
 * El resultado viaja en la query (`?error=CODIGO`) y no como estado devuelto: un
 * `<form action={...}>` de servidor no puede contestarle a la página que lo
 * pintó, y hacerlo con `useActionState` convertiría la tabla en un componente de
 * cliente. Es el mismo recurso que el aviso de carrito lleno en `cart.ts`.
 *
 * Nada de lo que llega aquí es de fiar: `orderId` y `status` salen de un campo
 * oculto y de un `<select>`, o sea, del navegador. Se validan otra vez, y detrás
 * vuelve a validar Spring, que es quien de verdad decide si el salto es legal.
 */

/** Los tres estados que la API acepta. Fuera de esta lista no se llama. */
const STATUSES: readonly OrderStatus[] = ["PREPARING", "SHIPPED", "DELIVERED"];

/** Lo que puede acabar en `?error=`. La página lo traduce; aquí es un código. */
export type AdminOrderErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "ORDER_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "VALIDATION_ERROR"
  | "UNEXPECTED";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function localeOf(formData: FormData): Locale {
  const value = field(formData, "locale");
  return hasLocale(value) ? value : defaultLocale;
}

function statusOf(formData: FormData, name: string): OrderStatus | null {
  const value = field(formData, name);
  return STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : null;
}

/**
 * A dónde vuelve el formulario. Siempre a la lista de este idioma, con el filtro
 * que el operador tenía puesto: se reconstruye desde cero en lugar de aceptar
 * una ruta del formulario, que sería un redirector abierto con la firma del
 * sitio.
 */
function listPath(
  locale: Locale,
  filter: OrderStatus | null,
  error: AdminOrderErrorCode | null,
): string {
  const params = new URLSearchParams();
  if (filter) params.set("status", filter);
  if (error) params.set("error", error);

  const query = params.toString();
  return `/${locale}/admin/orders${query ? `?${query}` : ""}`;
}

function codeOf(error: unknown): AdminOrderErrorCode {
  if (!(error instanceof ApiError)) return "UNEXPECTED";

  switch (error.status) {
    // El front dijo que este usuario es administrador y Spring dice que no.
    // Gana Spring, y la pantalla lo cuenta en vez de no hacer nada en silencio.
    case 403:
      return "FORBIDDEN";
    case 401:
      return "UNAUTHENTICATED";
    case 404:
      return "ORDER_NOT_FOUND";
    // Formulario enviado dos veces o pestaña vieja. No se reintenta: repetir el
    // cambio le mandaría al cliente un correo que nadie pidió.
    case 409:
      return "INVALID_STATUS_TRANSITION";
    default:
      return "UNEXPECTED";
  }
}

export async function changeOrderStatus(formData: FormData) {
  const locale = localeOf(formData);
  const filter = statusOf(formData, "filter");
  const status = statusOf(formData, "status");
  const orderId = Math.trunc(Number(field(formData, "orderId")));

  let error: AdminOrderErrorCode | null = null;

  const session = await getSession();
  if (!session) {
    error = "UNAUTHENTICATED";
  } else if (!status || !Number.isFinite(orderId) || orderId <= 0) {
    error = "VALIDATION_ERROR";
  } else {
    try {
      await updateOrderStatus(orderId, status, session.token);
      // La lista y el detalle son dinámicos, pero el caché del enrutador puede
      // servir la tabla anterior tras la redirección.
      revalidatePath(`/${locale}/admin/orders`);
      revalidatePath(`/${locale}/admin/orders/${orderId}`);
    } catch (caught) {
      error = codeOf(caught);
    }
  }

  // Fuera del try: `redirect` lanza, y dentro lo atraparía el catch de arriba.
  redirect(listPath(locale, filter, error));
}
