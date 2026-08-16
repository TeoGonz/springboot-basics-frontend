import Link from "next/link";
import { BsTrash } from "react-icons/bs";

import { removeLine, setQuantity } from "@/app/actions/cart";
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
 * La cantidad es un `<input type="number" min="0" max="99">` con su botón de
 * envío. El `0` borra la línea, que es justo lo que anuncia el `min`; poner 500
 * la deja en 99, el mismo tope que el `@Max(99)` del backend.
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

        <div>
          <label htmlFor={quantityId} className="mb-1 block text-xs text-slate-500">
            {t["cart.quantity"]}
          </label>
          <input
            id={quantityId}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_QTY}
            defaultValue={line.q}
            className="focus:border-brand focus:ring-brand/30 w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring-2"
          />
        </div>

        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100"
        >
          {t["cart.update"]}
        </button>
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
