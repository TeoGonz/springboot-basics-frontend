import Link from "next/link";
import { BsBoxArrowInRight, BsJournalCode, BsShop } from "react-icons/bs";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Dictionary, Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  t: Dictionary;
};

/**
 * Barra pública de la bitácora: marca, acceso y selector de idioma.
 *
 * No mira la cookie de sesión a propósito: leerla convertiría la bitácora
 * —prerenderizada en build— en una página dinámica. Si ya hay sesión, es
 * `/login` quien redirige a la cuenta.
 */
export default function PublicNav({ locale, t }: Props) {
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

          <Link
            href={`/${locale}/login`}
            className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-sm transition hover:bg-white/10"
          >
            <BsBoxArrowInRight aria-hidden />
            {t["nav.login"]}
          </Link>

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
