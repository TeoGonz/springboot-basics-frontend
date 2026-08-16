import Link from "next/link";

import type { OrderStatus } from "@/lib/api";
import type { Dictionary, Locale } from "@/lib/i18n";

const STATUSES: readonly OrderStatus[] = ["PREPARING", "SHIPPED", "DELIVERED"];

/**
 * Filtro por estado de la tabla de administración.
 *
 * `<form method="get">` contra su propia ruta, igual que los filtros de la
 * tienda: el estado vive en la URL, el botón de atrás funciona, el enlace se
 * puede compartir y no hace falta JavaScript. El desplegable enseña el valor que
 * de verdad se aplicó, no el que se pidió — un `?status=` que la página no
 * reconoce se trata como ausente.
 */
export default function AdminOrderFilters({
  locale,
  t,
  status,
}: {
  locale: Locale;
  t: Dictionary;
  status: OrderStatus | null;
}) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div>
        <label
          htmlFor="status"
          className="mb-1 block text-sm font-medium"
        >
          {t["admin.orders.filter"]}
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className="focus:border-brand focus:ring-brand/30 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2"
        >
          <option value="">{t["admin.orders.filter.all"]}</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {t[`order.status.${option}`]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-linear-90 from-brand to-brand-2 rounded-md px-4 py-2 text-sm text-white transition hover:brightness-110"
      >
        {t["admin.orders.filter.apply"]}
      </button>

      <Link
        href={`/${locale}/admin/orders`}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
      >
        {t["admin.orders.filter.clear"]}
      </Link>
    </form>
  );
}
