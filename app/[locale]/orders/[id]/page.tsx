import Link from "next/link";
import { notFound } from "next/navigation";
import { BsArrowLeft, BsBoxArrowInRight } from "react-icons/bs";

import { logout } from "@/app/actions/auth";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderStatusSteps from "@/components/orders/OrderStatusSteps";
import PublicNav from "@/components/PublicNav";
import ProductImage from "@/components/store/ProductImage";
import { ApiError, getMyOrder, type OrderDetailResponse } from "@/lib/api";
import {
  formatDateTime,
  formatPrice,
  getDictionary,
  hasLocale,
} from "@/lib/i18n";
import { getSession } from "@/lib/session";

// El layout de `[locale]` lleva `dynamicParams = false` para sus tres idiomas.
// Un id de pedido no tiene lista que prerenderizar, así que este segmento las
// vuelve a abrir — igual que `store/[id]`.
export const dynamicParams = true;

/**
 * Seguimiento de un pedido: el mapa de estado, los datos de envío con los que se
 * hizo y las líneas congeladas.
 *
 * Las líneas salen del pedido, nunca del catálogo: por eso el backend guardó
 * una copia. Un producto renombrado o borrado en DummyJSON no reescribe lo que
 * el cliente compró.
 *
 * La propiedad la comprueba Spring. Un pedido ajeno responde 404, igual que uno
 * inexistente, y esta página pinta lo mismo para los dos: distinguirlos
 * desharía esa decisión.
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();

  const t = getDictionary(locale);
  const session = await getSession();

  const numericId = Number(id);
  const valid = Number.isInteger(numericId) && numericId > 0;

  let order: OrderDetailResponse | null = null;
  let expired = false;
  let failed = false;

  if (session && valid) {
    try {
      order = await getMyOrder(numericId, session.token);
    } catch (error) {
      if (!(error instanceof ApiError)) failed = true;
      else if (error.status === 401) expired = true;
      else if (error.status !== 404) failed = true;
    }
  }

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-10">
        <div className="mx-auto w-full max-w-3xl px-4">
          <Link
            href={`/${locale}/orders`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <BsArrowLeft aria-hidden />
            {t["orders.back"]}
          </Link>

          {/* Como en la ficha de producto, no se llama a `notFound()`: la 404 de
              Next se pinta fuera de este layout y perdería la barra y el idioma.
              Un id que no es tuyo es un resultado normal de esta página. */}
          {!session ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <h1 className="mb-2 text-2xl font-bold">
                {t["orders.signIn.title"]}
              </h1>
              <p className="mb-6 text-slate-500">{t["orders.signIn.body"]}</p>
              <Link
                href={`/${locale}/login`}
                className="bg-linear-90 from-brand to-brand-2 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                <BsBoxArrowInRight aria-hidden />
                {t["orders.signIn.link"]}
              </Link>
            </div>
          ) : expired ? (
            <>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t["auth.account.invalidSession"]}
              </p>
              <form action={logout} className="mt-4">
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
                >
                  {t["common.logout"]}
                </button>
              </form>
            </>
          ) : failed ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t["orders.error.UNEXPECTED"]}
            </p>
          ) : !order ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <h1 className="mb-2 text-2xl font-bold">
                {t["orders.notFound"]}
              </h1>
              <p className="text-slate-500">{t["orders.notFoundBody"]}</p>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">#{order.id}</h1>
                <OrderStatusBadge status={order.status} t={t} />
                <p className="text-sm text-slate-500">
                  {formatDateTime(order.createdAt, locale)}
                </p>
              </div>

              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-6 font-semibold">{t["orders.progress"]}</h2>
                <OrderStatusSteps status={order.status} t={t} />
                <p className="mt-6 text-sm text-slate-500">
                  {t["orders.lastUpdate"]}{" "}
                  {formatDateTime(order.updatedAt, locale)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {t["orders.note.reload"]}
                </p>
              </section>

              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-2 font-semibold">{t["orders.shipping"]}</h2>
                <p className="text-sm text-slate-600">{order.recipientName}</p>
                <p className="text-sm text-slate-600">{order.address}</p>
                <p className="text-sm text-slate-600">{order.phone}</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white">
                <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">
                  {t["orders.items"]}
                </h2>
                <ul>
                  {order.items.map((item) => (
                    <li
                      key={item.productId}
                      className="flex items-center gap-4 border-b border-slate-200 px-4 py-4"
                    >
                      <ProductImage
                        src={item.imageUrl}
                        title={item.title}
                        className="h-14 w-14 shrink-0 rounded-md"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-slate-500">
                          {item.quantity} × {formatPrice(item.unitPrice, locale)}
                        </p>
                      </div>
                      <p className="text-brand font-bold">
                        {formatPrice(item.lineTotal, locale)}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between px-4 py-4">
                  <p className="font-semibold">{t["orders.total"]}</p>
                  <p className="text-brand text-lg font-bold">
                    {formatPrice(order.total, locale)}
                  </p>
                </div>
              </section>

              <p className="mt-4 text-xs text-slate-400">
                {t["store.note.language"]}
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
