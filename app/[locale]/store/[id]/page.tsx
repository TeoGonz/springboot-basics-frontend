import Link from "next/link";
import { notFound } from "next/navigation";
import { BsArrowLeft } from "react-icons/bs";

import AddToCartForm from "@/components/cart/AddToCartForm";
import PublicNav from "@/components/PublicNav";
import ProductImage from "@/components/store/ProductImage";
import { formatPrice, getDictionary, hasLocale } from "@/lib/i18n";
import { getProduct, StoreUnavailableError, type StoreProduct } from "@/lib/store-api";

// El layout de `[locale]` lleva `dynamicParams = false` para sus tres idiomas.
// Este segmento sí acepta cualquier id: el catálogo lo llena un tercero y no
// hay lista que prerenderizar.
export const dynamicParams = true;

/**
 * Ficha de producto. Es donde `GET /products/{id}` y su 400 disfrazado de 404
 * se ganan el sitio.
 */
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();

  const t = getDictionary(locale);
  // El aviso del tope del carrito llega en la query: un `<form>` de servidor no
  // puede devolverle estado a la página que lo pintó.
  const cartFull = (await searchParams).cart === "full";

  const numericId = Number(id);
  const exists = Number.isInteger(numericId) && numericId > 0;

  let product: StoreProduct | null = null;
  let unavailable = false;

  if (exists) {
    try {
      product = await getProduct(numericId);
    } catch (error) {
      if (!(error instanceof StoreUnavailableError)) throw error;
      unavailable = true;
    }
  }

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-10">
        <div className="mx-auto w-full max-w-4xl px-4">
          <Link
            href={`/${locale}/store`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <BsArrowLeft aria-hidden />
            {t["store.product.back"]}
          </Link>

          {cartFull && (
            <p
              role="alert"
              className="mb-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {t["cart.full"]}
            </p>
          )}

          {/* No se llama a `notFound()`: la 404 de Next se pinta fuera de este
              layout y perdería la barra y el idioma. Un id que no existe es un
              resultado normal de esta página, no un fallo de rutas. */}
          {unavailable ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t["store.unavailable"]}
            </p>
          ) : !product ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <h1 className="mb-2 text-2xl font-bold">
                {t["store.product.notFound"]}
              </h1>
              <p className="text-slate-500">{t["store.product.notFoundBody"]}</p>
            </div>
          ) : (
            <article className="grid gap-8 md:grid-cols-2">
              <ProductImage
                images={product.images}
                title={product.title}
                className="aspect-square w-full rounded-2xl border border-slate-200"
              />

              <div>
                {product.category && (
                  <span className="mb-3 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs tracking-wide text-slate-600 uppercase">
                    {product.category.name}
                  </span>
                )}

                <h1 className="mb-3 text-3xl font-bold">{product.title}</h1>

                <p className="text-brand mb-6 text-2xl font-bold">
                  {formatPrice(product.price, locale)}
                </p>

                <AddToCartForm
                  product={product}
                  locale={locale}
                  t={t}
                  returnTo={`/${locale}/store/${product.id}`}
                  className="mb-6 max-w-xs"
                />

                <p className="mb-6 whitespace-pre-line text-slate-600">
                  {product.description}
                </p>

                <p className="text-sm text-slate-400">
                  {t["store.note.language"]}
                </p>
              </div>
            </article>
          )}
        </div>
      </main>
    </>
  );
}
