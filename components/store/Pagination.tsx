import Link from "next/link";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";

import type { Dictionary, Locale } from "@/lib/i18n";
import { storeHref, type ProductQuery } from "@/lib/store-api";

type Props = {
  locale: Locale;
  t: Dictionary;
  query: ProductQuery;
  hasNext: boolean;
};

const link =
  "flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm transition hover:bg-slate-100";

/**
 * Anterior y siguiente, sin números de página. La API devuelve un array pelado
 * —ni total ni cabecera de conteo—, así que numerar exigiría descargar los 68
 * productos para enseñar 12. La dirección que no existe no se pinta: un botón
 * muerto se lee como algo que debería funcionar.
 */
export default function Pagination({ locale, t, query, hasNext }: Props) {
  if (query.page === 1 && !hasNext) return null;

  return (
    <nav
      aria-label={t["store.pagination.label"]}
      className="mt-8 flex items-center justify-center gap-4"
    >
      {query.page > 1 && (
        <Link href={storeHref(locale, query, query.page - 1)} className={link}>
          <BsArrowLeft aria-hidden />
          {t["store.pagination.previous"]}
        </Link>
      )}

      <span className="text-sm text-slate-500">
        {t["store.pagination.page"]} {query.page}
      </span>

      {hasNext && (
        <Link href={storeHref(locale, query, query.page + 1)} className={link}>
          {t["store.pagination.next"]}
          <BsArrowRight aria-hidden />
        </Link>
      )}
    </nav>
  );
}
