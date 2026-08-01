import Link from "next/link";
import { BsJournalCode } from "react-icons/bs";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Dictionary, Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  t: Dictionary;
};

/** Barra pública de la bitácora: marca + selector de idioma. */
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

        <LanguageSwitcher
          locale={locale}
          label={t["nav.language"]}
          names={{ es: t["lang.es"], en: t["lang.en"], pt: t["lang.pt"] }}
        />
      </div>
    </nav>
  );
}
