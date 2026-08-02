import { notFound } from "next/navigation";

import PublicNav from "@/components/PublicNav";
import Pagination from "@/components/store/Pagination";
import ProductCard from "@/components/store/ProductCard";
import StoreFilters from "@/components/store/StoreFilters";
import { getDictionary, hasLocale } from "@/lib/i18n";
import {
  getCategories,
  getProducts,
  parseProductQuery,
  StoreUnavailableError,
  type ProductQuery,
  type StoreCategory,
  type StoreProduct,
} from "@/lib/store-api";

type SearchParams = Record<string, string | string[] | undefined>;

type StoreView =
  | {
      ok: true;
      categories: StoreCategory[];
      query: ProductQuery;
      products: StoreProduct[];
      hasNext: boolean;
    }
  | { ok: false };

/**
 * Categorías y productos en un solo intento. Las categorías van primero porque
 * el filtro de la URL se valida contra ellas: `?category=loquesea` se ignora en
 * vez de viajar a la API.
 */
async function load(searchParams: SearchParams): Promise<StoreView> {
  try {
    const categories = await getCategories();
    const query = parseProductQuery(
      searchParams,
      categories.map((category) => category.slug),
    );
    const { products, hasNext } = await getProducts(query);

    return { ok: true, categories, query, products, hasNext };
  } catch (error) {
    // Solo se traga el "la API no contesta". Cualquier otro fallo es un error
    // de verdad y tiene que subir.
    if (error instanceof StoreUnavailableError) return { ok: false };
    throw error;
  }
}

/**
 * Simulador de tienda: rejilla de productos con filtros. Lee los filtros de la
 * URL y los resuelve en el servidor, como el resto de la app — el navegador no
 * llama a ninguna API.
 */
export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const t = getDictionary(locale);
  const view = await load(await searchParams);

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-10">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h1 className="mb-1 text-3xl font-bold">{t["store.title"]}</h1>
          <p className="mb-2 text-slate-500">{t["store.subtitle"]}</p>
          <p className="mb-8 text-sm text-slate-400">
            {t["store.note.language"]}
          </p>

          {!view.ok ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t["store.unavailable"]}
            </p>
          ) : (
            <>
              <StoreFilters
                locale={locale}
                t={t}
                categories={view.categories}
                query={view.query}
              />

              {view.products.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
                  {t["store.empty"]}
                </p>
              ) : (
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {view.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      locale={locale}
                    />
                  ))}
                </ul>
              )}

              <Pagination
                locale={locale}
                t={t}
                query={view.query}
                hasNext={view.hasNext}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
