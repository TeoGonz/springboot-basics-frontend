import { BsImage } from "react-icons/bs";

import { safeImage } from "@/lib/store-api";

type Props = {
  images: string[];
  /** Solo para el `alt`. El hueco no lo usa: va marcado como decorativo. */
  title: string;
  className?: string;
};

/**
 * Imagen de un producto.
 *
 * Sin `next/image` a propósito: optimizar obliga a declarar en
 * `next.config.ts` los dominios permitidos, y los de un sandbox donde publica
 * cualquiera no son una lista fija — hoy hay `i.imgur.com`, `placehold.co`,
 * `api.lorem.space` y dominios inventados. Un `<img loading="lazy">` detrás del
 * saneador no necesita saber de antemano de dónde viene la foto.
 */
export default function ProductImage({ images, title, className = "" }: Props) {
  const src = safeImage(images);

  // No es una URL (`"image123.png"`, cadenas vacías). El hueco es decorativo:
  // el título ya está en el texto de al lado, repetirlo solo estorba.
  if (!src) {
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
      src={src}
      alt={title}
      loading="lazy"
      className={`bg-slate-100 object-cover ${className}`}
    />
  );
}
