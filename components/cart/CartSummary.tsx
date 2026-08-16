import Link from "next/link";
import { BsBoxSeam } from "react-icons/bs";

import { cartCount, cartTotal, type CartLine } from "@/lib/cart";
import { formatPrice, type Dictionary, type Locale } from "@/lib/i18n";

type Props = {
  lines: CartLine[];
  locale: Locale;
  t: Dictionary;
  /** El resumen del checkout ya está dentro del flujo: no repite el botón. */
  action?: boolean;
};

/**
 * Cuenta, total y llamada a la acción.
 *
 * El total se recalcula aquí solo para enseñarlo. El número que vale es el
 * `total` que devuelve la API, que se computa en el backend a partir de las
 * mismas líneas.
 */
export default function CartSummary({ lines, locale, t, action = true }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <BsBoxSeam aria-hidden className="text-brand" />
        {t["checkout.summary"]}
      </h2>

      <dl className="mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">{t["cart.count"]}</dt>
          <dd>{cartCount(lines)}</dd>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <dt>{t["cart.total"]}</dt>
          <dd className="text-brand">{formatPrice(cartTotal(lines), locale)}</dd>
        </div>
      </dl>

      {action && (
        <Link
          href={`/${locale}/checkout`}
          className="bg-linear-90 from-brand to-brand-2 block rounded-md px-4 py-2 text-center text-sm font-medium text-white transition hover:brightness-110"
        >
          {t["cart.checkout"]}
        </Link>
      )}

      <p className="mt-4 text-xs text-slate-400">{t["cart.note.price"]}</p>
    </div>
  );
}
