import type { OrderStatus } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n";

/** El color acompaña al texto, nunca lo sustituye: el estado se lee escrito. */
const TONE: Record<string, string> = {
  PREPARING: "bg-amber-100 text-amber-800",
  SHIPPED: "bg-sky-100 text-sky-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
};

/**
 * Etiqueta del estado, compartida por la lista y el detalle.
 *
 * La API contesta `"SHIPPED"` —códigos, no frases, como todo lo que devuelve— y
 * la traducción vive aquí. El correo traduce su propia copia en el backend
 * porque allí es donde se escribe la prosa; esto es la otra cara de la misma
 * regla.
 *
 * Un estado que esta página no conoce se pinta crudo y en gris: la API puede
 * ganar uno antes de que el front se entere, y eso no es motivo para romper.
 */
export default function OrderStatusBadge({
  status,
  t,
}: {
  status: OrderStatus;
  t: Dictionary;
}) {
  const tone = TONE[status] ?? "bg-slate-100 text-slate-700";
  const label = t[`order.status.${status}`] ?? status;

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}
