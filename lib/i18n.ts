import es from "@/messages/es.json";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

export const locales = ["es", "en", "pt"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

/** El bundle español es la referencia: si en/pt pierden una clave, esto no compila. */
export type Dictionary = typeof es;

export type MessageKey = keyof Dictionary;

const dictionaries: Record<Locale, Dictionary> = { es, en, pt };

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Sustituye a `#temporals.format(fecha, 'dd MMM yyyy', #locale)` de Thymeleaf. */
export function formatDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00`));
}

/**
 * Precios del catálogo de la tienda. La API los da en dólares y sin decimales;
 * lo que cambia con el idioma es dónde va el símbolo y cómo se agrupan los
 * miles (`$1,999` · `1999 US$`).
 */
export function formatPrice(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
