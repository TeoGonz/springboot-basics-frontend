/**
 * Cliente de DummyJSON (https://dummyjson.com), el catálogo del simulador de
 * tienda. No tiene nada que ver con `lib/api.ts`: aquélla es la API de Spring,
 * lleva credenciales y por eso no cachea nada. Ésta es un catálogo público e
 * igual para todo el mundo, así que cachea.
 *
 * Solo lectura. Sus verbos de escritura responden pero no persisten, así que
 * implementarlos no demostraría nada.
 *
 * **Los filtros se aplican aquí, no en la API.** La tienda combina cuatro en
 * AND —texto, categoría, mínimo y máximo— y la API no sabe hacer eso: no tiene
 * ningún parámetro de precio, y `q` junto a `category` descarta la categoría en
 * silencio. Así que se pide el catálogo entero una vez (194 productos, 68 KB
 * con `select`), se cachea y se filtra en memoria. La decisión se sostiene
 * porque el catálogo es pequeño y fijo; uno de varios miles le da la vuelta al
 * cálculo y el filtrado vuelve al servidor de la API.
 */

const BASE_URL = "https://dummyjson.com";

/** Los campos que la tienda pinta. Recorta el catálogo de 306 KB a 68 KB: el
 *  resto son `rating`, `stock`, `brand`, `reviews`, `dimensions`… */
const FIELDS = "title,price,category,description,thumbnail";

/** Productos por página en la rejilla. */
export const PAGE_SIZE = 12;

/** Un tercero sin acuerdo de servicio. Una petición colgada no puede quedarse
 *  bloqueando el render de la página. */
const TIMEOUT_MS = 8000;

export type StoreCategory = {
  /** Ya es seguro para una URL: `mens-shirts`, `womens-jewellery`. */
  slug: string;
  name: string;
};

export type StoreProduct = {
  id: number;
  title: string;
  price: number;
  description: string;
  /** El slug de la categoría, el mismo que viaja en `?category=`. */
  category: string;
  thumbnail: string;
};

/** Los filtros ya normalizados. */
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Lo que no traiga id, título y precio no se puede pintar ni meter en el
 *  carrito. Se descarta la entrada, no la respuesta entera. */
function toProduct(raw: unknown): StoreProduct | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "number" || typeof raw.title !== "string") return null;
  if (typeof raw.price !== "number" || !Number.isFinite(raw.price)) return null;

  return {
    id: raw.id,
    title: raw.title,
    price: raw.price,
    description: typeof raw.description === "string" ? raw.description : "",
    category: typeof raw.category === "string" ? raw.category : "",
    thumbnail: typeof raw.thumbnail === "string" ? raw.thumbnail : "",
  };
}

/**
 * El catálogo completo en una llamada. `limit=0` no devuelve cero productos:
 * devuelve todos. De aquí salen la rejilla, los filtros y la ficha.
 *
 * No se exporta: fuera de este módulo nadie necesita los 194 productos, y que
 * `getProducts` y `getProduct` compartan la misma llamada cacheada es justo lo
 * que hace que la ficha no cueste una petición extra. Next memoiza `fetch`
 * dentro de un render y `revalidate` cubre el resto.
 */
async function getCatalogue(): Promise<StoreProduct[]> {
  const path = `/products?limit=0&select=${FIELDS}`;
  const { status, body } = await request(path, 300);

  if (status !== 200 || !isRecord(body) || !Array.isArray(body.products)) {
    throw new StoreUnavailableError(path);
  }

  return body.products
    .map(toProduct)
    .filter((product): product is StoreProduct => product !== null);
}

/** Las 24 categorías, con etiqueta legible para el desplegable. Se prefiere a
 *  `/products/category-list`, que devuelve los mismos slugs sin nombre. */
export async function getCategories(): Promise<StoreCategory[]> {
  const path = "/products/categories";
  const { status, body } = await request(path, 300);

  if (status !== 200 || !Array.isArray(body)) throw new StoreUnavailableError(path);

  return body
    .filter(
      (raw): raw is { slug: string; name: string } =>
        isRecord(raw) && typeof raw.slug === "string" && typeof raw.name === "string",
    )
    .map(({ slug, name }) => ({ slug, name }));
}

/** Los cuatro filtros, en AND, con las mismas reglas que ya aplicaba la API
 *  anterior: subcadena en el título sin distinguir mayúsculas, categoría
 *  exacta y rango numérico con cada extremo suelto. */
function matches(product: StoreProduct, query: ProductQuery): boolean {
  if (query.q && !product.title.toLowerCase().includes(query.q.toLowerCase())) {
    return false;
  }
  if (query.category && product.category !== query.category) return false;
  if (query.min !== undefined && product.price < query.min) return false;
  if (query.max !== undefined && product.price > query.max) return false;

  return true;
}

export async function getProducts(
  query: ProductQuery,
): Promise<{ products: StoreProduct[]; hasNext: boolean }> {
  const found = (await getCatalogue()).filter((product) => matches(product, query));
  const start = (query.page - 1) * PAGE_SIZE;

  return {
    products: found.slice(start, start + PAGE_SIZE),
    hasNext: found.length > start + PAGE_SIZE,
  };
}

/**
 * `null` cuando el id no existe. Se busca en el catálogo ya cacheado en vez de
 * pedir `GET /products/{id}`: cero peticiones extra y la ficha no puede
 * contradecir a la rejilla desde la que se abrió.
 */
export async function getProduct(id: number): Promise<StoreProduct | null> {
  return (await getCatalogue()).find((product) => product.id === id) ?? null;
}

/**
 * La URL si es utilizable, o `null`. Hoy todas las miniaturas viven en
 * `cdn.dummyjson.com`, pero el guardia se queda: el día que el catálogo cambie,
 * esto es lo que falla en silencio en vez de meter un `javascript:` en un `src`.
 */
export function safeImage(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;

  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/** Etiqueta de la categoría cuando solo se tiene el slug: la rejilla no carga
 *  la lista de categorías para pintar una insignia. */
export function categoryLabel(slug: string): string {
  return slug.replace(/-/g, " ");
}

// --- Los filtros que llegan por la URL ---

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? (value[0] ?? "") : (value ?? "")).trim();
}

/** Número positivo o nada. Se aceptan decimales porque los precios los tienen
 *  (de `0.79` a `36999.99`); truncar dejaría fuera lo que se pidió. */
function parsePrice(value: string): number | undefined {
  if (!value) return undefined;

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

/**
 * Traduce la query string a filtros válidos. Nada de lo que venga aquí se usa
 * tal cual: la URL se puede editar a mano.
 */
export function parseProductQuery(
  searchParams: SearchParams,
  allowedCategories: string[],
): ProductQuery {
  const q = single(searchParams.q);
  const category = single(searchParams.category);

  let min = parsePrice(single(searchParams.min));
  let max = parsePrice(single(searchParams.max));

  // Un enlace mal escrito puede traer el rango del revés. Cada extremo funciona
  // suelto, así que solo hay que ordenarlos cuando vienen los dos.
  if (min !== undefined && max !== undefined && min > max) {
    [min, max] = [max, min];
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
