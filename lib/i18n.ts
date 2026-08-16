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
 * Instantes que devuelve la API (`Instant` de Java, ISO con zona) — el momento
 * en que se registró un pedido o en que se movió por última vez.
 *
 * No vale `formatDate`: aquella recibe `YYYY-MM-DD` y le pega la hora que falta,
 * así que un instante completo le llega con dos horas. Aquí sí hay hora y sí
 * importa: dos pedidos del mismo día se distinguen por ella.
 *
 * Lo hace el servidor, con su zona horaria. Que un cliente en otro huso vea la
 * hora del servidor es lo que hay: la alternativa es formatear en el navegador,
 * y eso convierte estas páginas en componentes de cliente.
 */
export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Precios del catálogo de la tienda, en dólares. Lo que cambia con el idioma es
 * dónde va el símbolo y cómo se agrupan los miles (`$1,999.00` · `1999,00 US$`).
 *
 * Los dos decimales son obligatorios, no decorativos: el catálogo trae céntimos
 * y redondear a unidades pinta `9.99` como `10 US$`, y una línea de `3 × 9.99`
 * como `30 US$` contra un total real de `29.97`. La suma la hace el backend con
 * `BigDecimal`; enseñar otra cosa es mentir sobre lo que se va a cobrar.
 */
export function formatPrice(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
