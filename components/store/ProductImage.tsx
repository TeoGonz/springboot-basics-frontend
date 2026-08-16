import { BsImage } from "react-icons/bs";

import { safeImage } from "@/lib/store-api";

type Props = {
  /** URL sin sanear: la del catálogo, la de una línea del carrito o la que
   *  congeló un pedido. El saneado se hace aquí para que ningún llamante pueda
   *  saltárselo. */
  src: string | null | undefined;
  /** Solo para el `alt`. El hueco no lo usa: va marcado como decorativo. */
  title: string;
  className?: string;
};

/**
 * Imagen de un producto.
 *
 * Sin `next/image` a propósito: optimizar obliga a declarar los dominios
 * permitidos en `next.config.ts`, y aquí llegan también URLs congeladas en
 * pedidos viejos, que son de cuando el catálogo era otro. Un `<img
 * loading="lazy">` detrás del saneador no necesita saber de antemano de dónde
 * viene la foto.
 */
export default function ProductImage({ src, title, className = "" }: Props) {
  const url = safeImage(src);

  // No es una URL utilizable. El hueco es decorativo: el título ya está en el
  // texto de al lado, repetirlo solo estorba.
  if (!url) {
    return (
      <div
        aria-hidden
        className={`grid place-items-center bg-slate-100 text-3xl text-slate-400 ${className}`}
      >
        <BsImage />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver el comentario del componente
    <img
      src={url}
      alt={title}
      loading="lazy"
      className={`bg-slate-100 object-cover ${className}`}
    />
  );
}
