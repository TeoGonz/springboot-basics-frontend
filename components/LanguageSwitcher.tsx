"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BsTranslate } from "react-icons/bs";

import { locales, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  /** Etiqueta del botón ("Idioma"), ya traducida. */
  label: string;
  /** Nombre de cada idioma en su propio idioma. */
  names: Record<Locale, string>;
};

/**
 * Sustituye al dropdown de Bootstrap del `publicNav`: cambia el primer segmento
 * de la ruta (`/es/...` -> `/en/...`) conservando la página actual.
 */
export default function LanguageSwitcher({ locale, label, names }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function hrefFor(target: Locale) {
    const segments = pathname.split("/");
    segments[1] = target;
    return segments.join("/") || `/${target}`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 transition hover:text-white"
      >
        <BsTranslate aria-hidden />
        <span>{label}</span>
        <span aria-hidden className="text-[0.6rem]">
          ▼
        </span>
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {locales.map((item) => (
            <li key={item} role="none">
              <Link
                role="menuitem"
                href={hrefFor(item)}
                onClick={() => setOpen(false)}
                aria-current={item === locale ? "true" : undefined}
                className={`block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 ${
                  item === locale ? "font-semibold text-brand" : ""
                }`}
              >
                {names[item]}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
