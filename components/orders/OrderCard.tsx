import Link from "next/link";
import { BsChevronRight } from "react-icons/bs";

import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import type { OrderSummaryResponse } from "@/lib/api";
import {
  formatDateTime,
  formatPrice,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

/**
 * Una fila de la lista de pedidos: número, fecha, estado, cuántos productos y
 * total. Las líneas no vienen en el resumen; para verlas hay que abrir el
 * detalle, que es lo que justifica la segunda llamada.
 */
export default function OrderCard({
  order,
  locale,
  t,
}: {
  order: OrderSummaryResponse;
  locale: Locale;
  t: Dictionary;
}) {
  return (
    <li>
      <Link
        href={`/${locale}/orders/${order.id}`}
        className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 px-4 py-4 transition last:border-b-0 hover:bg-slate-50"
      >
        <div className="min-w-32">
          <p className="text-lg font-bold">#{order.id}</p>
          <p className="text-sm text-slate-500">
            {formatDateTime(order.createdAt, locale)}
          </p>
        </div>

        <OrderStatusBadge status={order.status} t={t} />

        <p className="text-sm text-slate-500">
          {order.itemCount} {t["orders.itemCount"]}
        </p>

        <p className="text-brand ml-auto font-bold">
          {formatPrice(order.total, locale)}
        </p>

        <BsChevronRight aria-hidden className="text-slate-400" />
      </Link>
    </li>
  );
}
