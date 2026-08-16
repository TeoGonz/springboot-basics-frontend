import { changeOrderStatus } from "@/app/actions/admin-orders";
import type { OrderStatus } from "@/lib/api";
import type { Dictionary, Locale } from "@/lib/i18n";

/** El orden del enum en la API. Avanzar es moverse a la derecha. */
const ORDER: readonly OrderStatus[] = ["PREPARING", "SHIPPED", "DELIVERED"];

/**
 * El control que mueve un pedido de estado.
 *
 * El `<select>` solo ofrece lo que la API va a aceptar: el enum avanza y puede
 * saltarse un paso, pero nunca retrocede ni repite el actual. Un pedido
 * `DELIVERED` no tiene a dónde ir, así que no se pinta formulario — la ausencia
 * del control *es* la información, y un desplegable vacío sería peor que nada.
 *
 * Un `<form>` de servidor, sin `useState` ni `fetch`: enviar es la navegación,
 * así que funciona con JavaScript apagado. Aun así se vuelve a validar en la
 * acción, porque el navegador puede mandar lo que quiera.
 */
export default function AdminStatusForm({
  orderId,
  status,
  locale,
  filter,
  t,
}: {
  orderId: number;
  status: OrderStatus;
  locale: Locale;
  filter: OrderStatus | null;
  t: Dictionary;
}) {
  const current = ORDER.indexOf(status);
  const next = current < 0 ? [] : ORDER.slice(current + 1);

  if (next.length === 0) {
    return (
      <span className="text-sm text-slate-400">{t["admin.orders.done"]}</span>
    );
  }

  return (
    <form action={changeOrderStatus} className="flex items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderId" value={orderId} />
      {/* El filtro viaja con el envío para volver a la misma vista. */}
      {filter && <input type="hidden" name="filter" value={filter} />}

      <label htmlFor={`status-${orderId}`} className="sr-only">
        {t["admin.orders.moveTo"]}
      </label>
      <select
        id={`status-${orderId}`}
        name="status"
        defaultValue={next[0]}
        className="focus:border-brand focus:ring-brand/30 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring-2"
      >
        {next.map((option) => (
          <option key={option} value={option}>
            {t[`order.status.${option}`]}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="bg-linear-90 from-brand to-brand-2 rounded-md px-3 py-1.5 text-sm text-white transition hover:brightness-110"
      >
        {t["admin.orders.move"]}
      </button>
    </form>
  );
}
