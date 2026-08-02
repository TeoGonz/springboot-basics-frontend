/**
 * Cliente de la Platzi Fake Store (https://api.escuelajs.co), el catálogo del
 * simulador de tienda. No tiene nada que ver con `lib/api.ts`: aquélla es la
 * API de Spring, lleva credenciales y por eso no cachea nada. Ésta es un
 * catálogo público e igual para todo el mundo, así que cachea.
 *
 * Solo lectura. La API es un sandbox donde cualquiera puede escribir; añadir
 * verbos de escritura no demostraría nada y ensuciaría los datos de los demás.
 */

const BASE_URL = "https://api.escuelajs.co/api/v1";

/** Productos por página en la rejilla. */
export const PAGE_SIZE = 12;

/**
 * Suelo del filtro de precio. `price_min=0` es falsy en el servidor y hace que
 * descarte el filtro entero y devuelva el catálogo completo, que se leería como
 * "filtrar no hace nada". Ningún producto cuesta 0, así que empezar en 1 no
 * esconde ninguno.
 */
export const MIN_PRICE = 1;

/**
 * Techo del filtro de precio. Existe porque la API solo aplica el rango cuando
 * llegan los dos extremos: pedir "desde 500" obliga a inventar un "hasta".
 */
export const MAX_PRICE = 1_000_000;

/** La API vive en un dyno gratuito que se duerme. Una petición colgada no
 *  puede quedarse bloqueando el render de la página. */
const TIMEOUT_MS = 8000;

export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  image: string;
};

export type StoreProduct = {
  id: number;
  title: string;
  slug: string;
  price: number;
  description: string;
  images: string[];
  /** El catálogo está abierto y hay productos publicados sin categoría. */
  category: StoreCategory | null;
};

/** Los filtros ya normalizados, listos para viajar a la API. */
export type ProductQuery = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  page: number;
};

/** La API no contestó: red caída o se agotó el tiempo. La página lo pinta como
 *  un aviso en vez de reventar con una traza. */
export class StoreUnavailableError extends Error {
  constructor(path: string) {
    super(`La tienda no respondió: ${path}`);
    this.name = "StoreUnavailableError";
  }
}

type RawResponse = { status: number; body: unknown };

async function request(path: string, revalidate: number): Promise<RawResponse> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
  } catch {
    throw new StoreUnavailableError(path);
  }

  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

/**
 * Las cinco categorías de la semilla, ids 1–5. Hoy la API tiene noventa y pico
 * más: `Electronics from Config-<uuid>`, una sin nombre, `orlfkl`… escritas por
 * quien pasaba por el sandbox. Un desplegable con ochenta UUIDs no es un
 * filtro. El precio de la decisión es real y conviene nombrarlo: una categoría
 * nueva y legítima no aparecería aquí. Adivinar cuáles son buenas con
 * heurísticas contra la basura de esta semana se rompe la que viene.
 */
export async function getCategories(): Promise<StoreCategory[]> {
  const path = "/categories?limit=5";
  const { status, body } = await request(path, 300);

  if (status !== 200 || !Array.isArray(body)) throw new StoreUnavailableError(path);
  return body as StoreCategory[];
}

function buildProductParams(query: ProductQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.q) params.set("title", query.q);
  if (query.category) params.set("categorySlug", query.category);

  // Los parámetros de la API funcionan por parejas: `price_min` suelto se
  // ignora en silencio y vuelve el catálogo entero. O van los dos, o ninguno.
  if (query.min !== undefined && query.max !== undefined) {
    params.set("price_min", String(query.min));
    params.set("price_max", String(query.max));
  }

  // Se pide un elemento de más: si llega, hay página siguiente. Es la única
  // manera de saberlo — la respuesta es un array pelado, sin total ni
  // `X-Total-Count`, así que numerar páginas exigiría descargarlo todo.
  params.set("offset", String((query.page - 1) * PAGE_SIZE));
  params.set("limit", String(PAGE_SIZE + 1));

  return params;
}

export async function getProducts(
  query: ProductQuery,
): Promise<{ products: StoreProduct[]; hasNext: boolean }> {
  const path = `/products?${buildProductParams(query)}`;
  const { status, body } = await request(path, 60);

  if (status !== 200 || !Array.isArray(body)) throw new StoreUnavailableError(path);

  const received = body as StoreProduct[];
  return {
    products: received.slice(0, PAGE_SIZE),
    hasNext: received.length > PAGE_SIZE,
  };
}

/**
 * `null` cuando el id no existe. La API contesta **400** con
 * `name: "EntityNotFoundError"`, no 404: sin traducirlo, un id inventado se
 * pintaría como error del servidor en lugar de como "no encontrado".
 */
export async function getProduct(id: number): Promise<StoreProduct | null> {
  const path = `/products/${id}`;
  const { status, body } = await request(path, 60);

  if (status === 400 || status === 404) return null;
  if (status !== 200 || !body) throw new StoreUnavailableError(path);

  return body as StoreProduct;
}

/**
 * La primera imagen utilizable, o `null`. El catálogo trae de todo:
 * `"image123.png"` sin dominio, entradas de un JSON codificado dos veces con
 * sus comillas y corchetes dentro, dominios inventados. Lo que no empiece por
 * http se descarta y quien pinte la imagen enseña un hueco.
 */
export function safeImage(images: string[]): string | null {
  for (const raw of images ?? []) {
    if (typeof raw !== "string") continue;

    const url = raw.replace(/[[\]"]/g, "").trim();
    if (/^https?:\/\//i.test(url)) return url;
  }

  return null;
}

// --- Los filtros que llegan por la URL ---

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? (value[0] ?? "") : (value ?? "")).trim();
}

/** Entero positivo o nada: la API responde 400 a `price_min=abc`, así que lo
 *  que no se entiende se trata como ausente en vez de reenviarlo. */
function parsePrice(value: string): number | undefined {
  if (!value) return undefined;

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? Math.trunc(price) : undefined;
}

/**
 * Traduce la query string a filtros válidos. Nada de lo que venga aquí se
 * reenvía tal cual: la URL se puede editar a mano y la API es estricta.
 */
export function parseProductQuery(
  searchParams: SearchParams,
  allowedCategories: string[],
): ProductQuery {
  const q = single(searchParams.q);
  const category = single(searchParams.category);

  let min = parsePrice(single(searchParams.min));
  let max = parsePrice(single(searchParams.max));

  if (min !== undefined || max !== undefined) {
    // Cada extremo implica el otro, con el suelo aplicado a los dos. Ordenarlos
    // al final cubre de paso el `min > max` de un enlace mal escrito.
    const a = Math.max(min ?? MIN_PRICE, MIN_PRICE);
    const b = Math.max(max ?? MAX_PRICE, MIN_PRICE);
    min = Math.min(a, b);
    max = Math.max(a, b);
  }

  const page = Math.trunc(Number(single(searchParams.page)));

  return {
    q: q || undefined,
    category: allowedCategories.includes(category) ? category : undefined,
    min,
    max,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Enlace a la tienda con los filtros actuales y la página que se pida. */
export function storeHref(
  locale: string,
  query: ProductQuery,
  page: number,
): string {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.min !== undefined) params.set("min", String(query.min));
  if (query.max !== undefined) params.set("max", String(query.max));
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return `/${locale}/store${search ? `?${search}` : ""}`;
}
