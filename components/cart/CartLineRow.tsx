import Link from "next/link";
import { BsTrash } from "react-icons/bs";

import { removeLine, setQuantity } from "@/app/actions/cart";
import QuantityInput from "@/components/cart/QuantityInput";
import ProductImage from "@/components/store/ProductImage";
import { MAX_QTY, type CartLine } from "@/lib/cart";
import { formatPrice, type Dictionary, type Locale } from "@/lib/i18n";

type Props = {
  line: CartLine;
  locale: Locale;
  t: Dictionary;
};

/**
 * Una línea del carrito con sus dos controles, cada uno en su propio `<form>`
 * de servidor: cambiar la cantidad y quitar el producto.
 *
 * La cantidad es un `<input type="number" min="0" max="99">` que se guarda solo
 * —ver `QuantityInput`—. El `0` borra la línea, que es justo lo que anuncia el
 * `min`; poner 500 la deja en 99, el mismo tope que el `@Max(99)` del backend.
 */
export default function CartLineRow({ line, locale, t }: Props) {
  const quantityId = `quantity-${line.i}`;

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0">
      <Link href={`/${locale}/store/${line.i}`} className="shrink-0">
        {/* La línea guarda una URL suelta; `ProductImage` espera la lista del
            catálogo y ya sabe descartar lo que no sea una URL. */}
        <ProductImage
          images={[line.m]}
          title={line.t}
          className="h-16 w-16 rounded-md"
        />
      </Link>

      <div className="min-w-40 flex-1">
        <Link
          href={`/${locale}/store/${line.i}`}
          className="font-medium hover:underline"
        >
          {line.t}
        </Link>
        <p className="text-sm text-slate-500">
          {t["cart.unitPrice"]}: {formatPrice(line.p, locale)}
        </p>
      </div>

      <form action={setQuantity} className="flex items-end gap-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="productId" value={line.i} />

        <QuantityInput
          id={quantityId}
          max={MAX_QTY}
          quantity={line.q}
          label={t["cart.quantity"]}
          updateLabel={t["cart.update"]}
        />
      </form>

      <p className="text-brand w-24 text-right font-bold">
        {formatPrice(line.p * line.q, locale)}
      </p>

      <form action={removeLine}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="productId" value={line.i} />
        <button
          type="submit"
          aria-label={`${t["cart.remove"]}: ${line.t}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <BsTrash aria-hidden />
        </button>
      </form>
    </li>
  );
}
