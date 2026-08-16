import Link from "next/link";
import { notFound } from "next/navigation";
import { BsArrowLeft, BsBoxArrowInRight } from "react-icons/bs";

import CartSummary from "@/components/cart/CartSummary";
import CheckoutForm from "@/components/cart/CheckoutForm";
import PublicNav from "@/components/PublicNav";
import { readCart } from "@/lib/cart";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

/**
 * Datos de envío.
 *
 * El carrito no pide sesión; esta pantalla sí. Un visitante anónimo ve el panel
 * de acceso en lugar del formulario y **no** se le redirige: el carrito es otra
 * cookie y sobrevive al viaje de ida y vuelta, así que volver aquí después de
 * entrar continúa donde lo dejó. Sin `?next=`, porque la app no tiene esa
 * convención y montarla para un enlace no compensa.
 */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const t = getDictionary(locale);
  const session = await getSession();
  const lines = await readCart();

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-10">
        <div className="mx-auto w-full max-w-5xl px-4">
          <Link
            href={`/${locale}/cart`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <BsArrowLeft aria-hidden />
            {t["checkout.backToCart"]}
          </Link>

          <h1 className="mb-1 text-3xl font-bold">{t["checkout.title"]}</h1>
          <p className="mb-8 text-slate-500">{t["checkout.subtitle"]}</p>

          {lines.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <p className="mb-4 text-slate-500">{t["checkout.empty"]}</p>
              <Link
                href={`/${locale}/store`}
                className="bg-linear-90 from-brand to-brand-2 inline-block rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                {t["cart.empty.link"]}
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                {session ? (
                  <CheckoutForm locale={locale} t={t} />
                ) : (
                  <>
                    <h2 className="mb-2 text-xl font-bold">
                      {t["checkout.signIn.title"]}
                    </h2>
                    <p className="mb-6 text-sm text-slate-500">
                      {t["checkout.signIn.body"]}
                    </p>
                    <Link
                      href={`/${locale}/login`}
                      className="bg-linear-90 from-brand to-brand-2 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                    >
                      <BsBoxArrowInRight aria-hidden />
                      {t["checkout.signIn.link"]}
                    </Link>
                  </>
                )}
              </div>

              <CartSummary lines={lines} locale={locale} t={t} action={false} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
