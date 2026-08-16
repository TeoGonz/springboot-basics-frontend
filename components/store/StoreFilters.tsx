import Link from "next/link";

import type { Dictionary, Locale } from "@/lib/i18n";
import type { ProductQuery, StoreCategory } from "@/lib/store-api";

type Props = {
  locale: Locale;
  t: Dictionary;
  categories: StoreCategory[];
  /** Los filtros ya normalizados: la caja enseña lo que de verdad se aplicó. */
  query: ProductQuery;
};

const field = "mb-1 block text-sm font-medium";
const input =
  "focus:border-brand focus:ring-brand/30 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2";

/**
 * Los filtros del catálogo.
 *
 * Es un `<form method="get">` que apunta a su propia ruta: enviar **es** la
 * navegación. Sin `useState`, sin `fetch` en el navegador y sin un solo
 * componente de cliente — funciona con JavaScript apagado, la URL queda
 * compartible y el botón de atrás hace lo que debe. Y como `page` no es un
 * campo del formulario, cambiar un filtro vuelve a la página 1 gratis.
 *
 * El precio es un salto de página completo por cada filtro aplicado. Para un
 * catálogo que se filtra dos veces por visita, sale a cuenta.
 */
export default function StoreFilters({ locale, t, categories, query }: Props) {
  return (
    <form
      method="get"
      className="mb-8 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <h2 className="sr-only">{t["store.filter.heading"]}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="q" className={field}>
            {t["store.filter.search"]}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query.q ?? ""}
            placeholder={t["store.filter.searchPlaceholder"]}
            className={input}
          />
        </div>

        <div>
          <label htmlFor="category" className={field}>
            {t["store.filter.category"]}
          </label>
          <select
            id="category"
            name="category"
            defaultValue={query.category ?? ""}
            className={input}
          >
            <option value="">{t["store.filter.allCategories"]}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cada extremo funciona suelto: el rango se aplica en nuestro
            servidor, sobre el catálogo entero. */}
        <div>
          <label htmlFor="min" className={field}>
            {t["store.filter.min"]}
          </label>
          <input
            id="min"
            name="min"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={query.min ?? ""}
            className={input}
          />
        </div>

        <div>
          <label htmlFor="max" className={field}>
            {t["store.filter.max"]}
          </label>
          <input
            id="max"
            name="max"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={query.max ?? ""}
            className={input}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          className="bg-linear-90 from-brand to-brand-2 rounded-md px-4 py-2 text-sm text-white transition hover:brightness-110"
        >
          {t["store.filter.apply"]}
        </button>

        <Link
          href={`/${locale}/store`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
        >
          {t["store.filter.clear"]}
        </Link>
      </div>
    </form>
  );
}
