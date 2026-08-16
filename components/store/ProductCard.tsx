import Link from "next/link";

import AddToCartForm from "@/components/cart/AddToCartForm";
import ProductImage from "@/components/store/ProductImage";
import { formatPrice, type Dictionary, type Locale } from "@/lib/i18n";
import type { StoreProduct } from "@/lib/store-api";

type Props = {
  product: StoreProduct;
  locale: Locale;
  t: Dictionary;
  /** Ruta actual con sus filtros: añadir vuelve a la misma rejilla. */
  returnTo: string;
};

/** Tarjeta de la rejilla. Es un `<li>`: el lector de pantalla anuncia cuántos
 *  productos hay en la página sin que haya que contarlos a mano.
 *
 *  El enlace envuelve la ficha pero **no** el botón de añadir: un formulario
 *  dentro de un enlace no es HTML válido y el envío pelearía con la navegación. */
export default function ProductCard({ product, locale, t, returnTo }: Props) {
  return (
    <li className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-250 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(79,70,229,0.12)]">
      <Link
        href={`/${locale}/store/${product.id}`}
        className="flex flex-1 flex-col"
      >
        <ProductImage
          images={product.images}
          title={product.title}
          className="h-44 w-full"
        />

        <div className="flex flex-1 flex-col p-4">
          {product.category && (
            <span className="mb-2 self-start rounded-full bg-slate-100 px-2 py-1 text-xs tracking-wide text-slate-600 uppercase">
              {product.category.name}
            </span>
          )}

          <h3 className="mb-3 flex-1 font-semibold">{product.title}</h3>

          <p className="text-brand text-lg font-bold">
            {formatPrice(product.price, locale)}
          </p>
        </div>
      </Link>

      <AddToCartForm
        product={product}
        locale={locale}
        t={t}
        returnTo={returnTo}
        className="px-4 pb-4"
      />
    </li>
  );
}
