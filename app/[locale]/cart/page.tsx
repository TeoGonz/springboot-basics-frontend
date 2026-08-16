import Link from "next/link";
import { notFound } from "next/navigation";
import { BsCart3 } from "react-icons/bs";

import { clearCart } from "@/app/actions/cart";
import CartLineRow from "@/components/cart/CartLineRow";
import CartSummary from "@/components/cart/CartSummary";
import PublicNav from "@/components/PublicNav";
import { readCart } from "@/lib/cart";
import { getDictionary, hasLocale } from "@/lib/i18n";

/**
 * El carrito.
 *
 * Se pinta entero desde la cookie: **cero** llamadas a la tienda. Es la ventaja
 * de guardar una copia del producto en vez de su id, y la razón por la que esta
 * página funciona aunque el catálogo esté dormido.
 */
export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const t = getDictionary(locale);
  const lines = await readCart();

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-10">
        <div className="mx-auto w-full max-w-5xl px-4">
          <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold">
            <BsCart3 aria-hidden className="text-brand" />
            {t["cart.title"]}
          </h1>
          <p className="mb-8 text-slate-500">{t["cart.subtitle"]}</p>

          {/* Un carrito vacío es un mensaje y una salida, no una tabla sin filas. */}
          {lines.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <p className="mb-4 text-slate-500">{t["cart.empty"]}</p>
              <Link
                href={`/${locale}/store`}
                className="bg-linear-90 from-brand to-brand-2 inline-block rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                {t["cart.empty.link"]}
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
              <div>
                <ul className="rounded-2xl border border-slate-200 bg-white">
                  {lines.map((line) => (
                    <CartLineRow key={line.i} line={line} locale={locale} t={t} />
                  ))}
                </ul>

                <p className="mt-2 text-xs text-slate-400">
                  {t["cart.note.quantity"]}
                </p>

                <form action={clearCart} className="mt-4">
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
                  >
                    {t["cart.clear"]}
                  </button>
                </form>
              </div>

              <CartSummary lines={lines} locale={locale} t={t} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
