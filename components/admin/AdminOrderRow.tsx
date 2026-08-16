import AdminStatusForm from "@/components/admin/AdminStatusForm";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import type { AdminOrderSummaryResponse, OrderStatus } from "@/lib/api";
import {
  formatDateTime,
  formatPrice,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

const cell = "px-3 py-3 align-middle";

/**
 * Una fila de la tabla de operación: número, quién pidió, cuándo, en qué estado,
 * cuántas líneas, cuánto, y el control para moverlo.
 *
 * Se enseña el `username`, nunca el correo: la API no lo manda y esta pantalla
 * no lo pide. La dirección sirve para enviar, no para listar clientes.
 *
 * El estado se pinta con la misma etiqueta que ve el cliente. Lo que no se
 * reutiliza de `frontend/08` es el mapa de pasos: el cliente quiere ver progreso
 * y el operador quiere un mando, y son cosas distintas.
 */
export default function AdminOrderRow({
  order,
  locale,
  filter,
  t,
}: {
  order: AdminOrderSummaryResponse;
  locale: Locale;
  filter: OrderStatus | null;
  t: Dictionary;
}) {
  return (
    <tr className="border-b border-slate-200 last:border-b-0">
      <td className={`${cell} font-bold`}>#{order.id}</td>
      <td className={cell}>{order.username}</td>
      <td className={`${cell} text-sm whitespace-nowrap text-slate-500`}>
        {formatDateTime(order.createdAt, locale)}
      </td>
      <td className={cell}>
        <OrderStatusBadge status={order.status} t={t} />
      </td>
      <td className={`${cell} text-sm text-slate-500`}>{order.itemCount}</td>
      <td className={`${cell} text-brand font-bold whitespace-nowrap`}>
        {formatPrice(order.total, locale)}
      </td>
      <td className={cell}>
        <AdminStatusForm
          orderId={order.id}
          status={order.status}
          locale={locale}
          filter={filter}
          t={t}
        />
      </td>
    </tr>
  );
}
