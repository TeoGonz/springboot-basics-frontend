import Link from "next/link";
import { notFound } from "next/navigation";
import { BsBoxArrowInRight, BsReceipt } from "react-icons/bs";

import { logout } from "@/app/actions/auth";
import OrderCard from "@/components/orders/OrderCard";
import PublicNav from "@/components/PublicNav";
import { ApiError, getMyOrders, type OrderSummaryResponse } from "@/lib/api";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

/**
 * Mis pedidos.
 *
 * Solo lectura, servida entera desde el servidor y sin sondeo: el estado lo
 * mueve un administrador horas después, así que la forma de refrescar es
 * recargar —y la página lo dice—. Un temporizador en el navegador para cazar un
 * evento que ocurre dos veces por pedido no compensa.
 *
 * Anónimo ve el panel de acceso, no una redirección: es el mismo trato que da
 * `/checkout`, y así la URL sigue siendo compartible.
 */
export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const t = getDictionary(locale);
  const session = await getSession();

  let orders: OrderSummaryResponse[] | null = null;
  let expired = false;
  let failed = false;

  if (session) {
    try {
      orders = await getMyOrders(session.token);
    } catch (error) {
      // La cookie parecía viva y Spring rechaza el token: mismo panel que
      // `/account`, con la salida para cerrar sesión a mano. Redirigir a /login
      // con la cookie puesta sería un bucle.
      if (error instanceof ApiError && error.status === 401) expired = true;
      else failed = true;
    }
  }

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-10">
        <div className="mx-auto w-full max-w-3xl px-4">
          <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold">
            <BsReceipt aria-hidden className="text-brand" />
            {t["orders.title"]}
          </h1>
          <p className="mb-8 text-slate-500">{t["orders.subtitle"]}</p>

          {!session ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <h2 className="mb-2 text-xl font-bold">
                {t["orders.signIn.title"]}
              </h2>
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
          ) : !orders || orders.length === 0 ? (
            // Un cliente sin pedidos es un estado normal, no un fallo.
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <p className="mb-4 text-slate-500">{t["orders.empty"]}</p>
              <Link
                href={`/${locale}/store`}
                className="bg-linear-90 from-brand to-brand-2 inline-block rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                {t["orders.empty.link"]}
              </Link>
            </div>
          ) : (
            <>
              {/* El orden lo pone la API, del más nuevo al más viejo. Aquí no se
                  reordena: sería una segunda verdad sobre lo mismo. */}
              <ul className="rounded-2xl border border-slate-200 bg-white">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    locale={locale}
                    t={t}
                  />
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-400">
                {t["orders.note.reload"]}
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
