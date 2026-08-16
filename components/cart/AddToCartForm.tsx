import { BsCartPlus } from "react-icons/bs";

import { addToCart } from "@/app/actions/cart";
import type { Dictionary, Locale } from "@/lib/i18n";
import { safeImage, type StoreProduct } from "@/lib/store-api";

type Props = {
  product: StoreProduct;
  locale: Locale;
  t: Dictionary;
  /** Ruta a la que vuelve el envío: la página que pintó este formulario. */
  returnTo: string;
  className?: string;
};

/**
 * Añadir al carrito: un `<form>` con campos ocultos y nada más.
 *
 * Enviar **es** la interacción, igual que en los filtros de la tienda. Sin
 * componente de cliente, sin `fetch` en el navegador y funcionando con
 * JavaScript apagado. Los campos llevan la copia del producto —título, precio e
 * imagen— porque el carrito guarda una foto del catálogo, no un puntero a él.
 *
 * Que los pinte el servidor no los hace de fiar: la acción vuelve a recortarlos
 * y a convertirlos antes de tocar la cookie.
 */
export default function AddToCartForm({
  product,
  locale,
  t,
  returnTo,
  className = "",
}: Props) {
  return (
    <form action={addToCart} className={className}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="title" value={product.title} />
      <input type="hidden" name="price" value={product.price} />
      <input type="hidden" name="image" value={safeImage(product.thumbnail) ?? ""} />

      <button
        type="submit"
        className="bg-linear-90 from-brand to-brand-2 flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
      >
        <BsCartPlus aria-hidden />
        {t["cart.add"]}
      </button>
    </form>
  );
}
