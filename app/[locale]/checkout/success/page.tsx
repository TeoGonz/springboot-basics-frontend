import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BsBoxArrowInRight,
  BsCheckCircle,
  BsEnvelopeCheck,
  BsTruck,
} from "react-icons/bs";

import ProductImage from "@/components/store/ProductImage";
import PublicNav from "@/components/PublicNav";
import { ApiError, getMyOrder, type OrderDetailResponse } from "@/lib/api";
import { formatPrice, getDictionary, hasLocale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Confirmación del pedido.
 *
 * La redirección trae solo el id y esta página vuelve a pedir el pedido a la
 * API: recargar enseña el pedido de verdad en vez de un número de la query, y
 * el id de otro responde 404 —la propiedad la comprueba Spring— en lugar de
 * pintar el recibo de un extraño.
 *
 * De aquí sale el único enlace al seguimiento (`/{locale}/orders/{id}`): quien
 * acaba de pedir es quien más quiere mirarlo.
 */
export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const t = getDictionary(locale);
  const session = await getSession();

  const raw = (await searchParams).order;
  const id = Math.trunc(Number(Array.isArray(raw) ? raw[0] : raw));
  const validId = Number.isFinite(id) && id > 0;

  let order: OrderDetailResponse | null = null;
  let failed = false;

  if (session && validId) {
    try {
      order = await getMyOrder(id, session.token);
    } catch (error) {
      // Un pedido ajeno y uno inexistente contestan lo mismo, a propósito. Solo
      // se distingue el fallo de verdad, que no es un "no encontrado".
      if (!(error instanceof ApiError) || error.status !== 404) failed = true;
    }
  }

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-10">
        <div className="mx-auto w-full max-w-3xl px-4">
          {/* Como en la ficha de producto, no se llama a `notFound()`: la 404 de
              Next se pinta fuera de este layout y perdería la barra y el idioma. */}
          {!session ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <h1 className="mb-2 text-2xl font-bold">
                {t["checkout.signIn.title"]}
              </h1>
              <Link
                href={`/${locale}/login`}
                className="bg-linear-90 from-brand to-brand-2 mt-4 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                <BsBoxArrowInRight aria-hidden />
                {t["checkout.signIn.link"]}
              </Link>
            </div>
          ) : failed ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t["checkout.error.UNEXPECTED"]}
            </p>
          ) : !order ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <h1 className="mb-2 text-2xl font-bold">
                {t["checkout.success.notFound"]}
              </h1>
              <p className="mb-6 text-slate-500">
                {t["checkout.success.notFoundBody"]}
              </p>
              <Link
                href={`/${locale}/store`}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
              >
                {t["checkout.success.backToStore"]}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold">
                <BsCheckCircle aria-hidden className="text-brand" />
                {t["checkout.success.title"]}
              </h1>

              {/* El correo es el requisito; esta frase es lo que le dice al
                  cliente que vaya a buscarlo. */}
              <p className="mb-8 flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <BsEnvelopeCheck aria-hidden className="mt-0.5 shrink-0" />
                {t["checkout.success.mail"]}
              </p>

              <dl className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-slate-500">
                    {t["checkout.success.number"]}
                  </dt>
                  <dd className="text-lg font-bold">#{order.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">
                    {t["checkout.success.status"]}
                  </dt>
                  <dd className="text-lg font-bold">
                    {t[`order.status.${order.status}`]}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">
                    {t["checkout.success.total"]}
                  </dt>
                  <dd className="text-brand text-lg font-bold">
                    {formatPrice(order.total, locale)}
                  </dd>
                </div>
              </dl>

              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-2 font-semibold">
                  {t["checkout.success.shipping"]}
                </h2>
                <p className="text-sm text-slate-600">{order.recipientName}</p>
                <p className="text-sm text-slate-600">{order.address}</p>
                <p className="text-sm text-slate-600">{order.phone}</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white">
                <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">
                  {t["checkout.success.items"]}
                </h2>
                <ul>
                  {order.items.map((item) => (
                    <li
                      key={item.productId}
                      className="flex items-center gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0"
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
              </section>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/orders/${order.id}`}
                  className="bg-linear-90 from-brand to-brand-2 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  <BsTruck aria-hidden />
                  {t["orders.trackLink"]}
                </Link>

                <Link
                  href={`/${locale}/store`}
                  className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
                >
                  {t["checkout.success.backToStore"]}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
