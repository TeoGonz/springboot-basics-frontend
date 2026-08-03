import Link from "next/link";
import {
  BsBoxArrowInRight,
  BsJournalCode,
  BsPersonCircle,
  BsShop,
} from "react-icons/bs";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Dictionary, Locale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

type Props = {
  locale: Locale;
  t: Dictionary;
};

/** Mismo aspecto con sesión y sin ella: cambian el icono, el texto y el destino. */
const accessLink =
  "flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-sm transition hover:bg-white/10";

/**
 * Barra pública de la bitácora: marca, tienda, acceso y selector de idioma.
 *
 * Con sesión abierta el botón de acceso lleva el nombre de quien entró y apunta
 * a su cuenta. El nombre sale del claim `sub` del token que ya está en la
 * cookie: sin llamada a la API, porque es un rótulo y no una autorización —
 * quien manipule su propia cookie solo se engaña a sí mismo.
 *
 * Leerla tiene un precio: ninguna página que monte esta barra se prerenderiza,
 * la bitácora incluida. Se acepta a cambio de que el botón deje de mentir en la
 * página a la que más se llega.
 */
export default async function PublicNav({ locale, t }: Props) {
  const session = await getSession();

  return (
    <nav className="sticky top-0 z-40 bg-slate-900 text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 font-bold transition hover:text-white/80"
        >
          <BsJournalCode aria-hidden />
          <span>{t["nav.brand.blog"]}</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/store`}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition hover:bg-white/10"
          >
            <BsShop aria-hidden />
            {t["nav.store"]}
          </Link>

          {session?.username ? (
            <Link href={`/${locale}/account`} className={accessLink}>
              <BsPersonCircle aria-hidden />
              {session.username}
            </Link>
          ) : (
            <Link href={`/${locale}/login`} className={accessLink}>
              <BsBoxArrowInRight aria-hidden />
              {t["nav.login"]}
            </Link>
          )}

          <LanguageSwitcher
            locale={locale}
            label={t["nav.language"]}
            names={{ es: t["lang.es"], en: t["lang.en"], pt: t["lang.pt"] }}
          />
        </div>
      </div>
    </nav>
  );
}
