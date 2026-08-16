/**
 * Cliente de la API de Spring. Solo se usa desde el servidor (Server Actions y
 * componentes de servidor): por eso la URL base no lleva prefijo NEXT_PUBLIC_ y
 * el navegador nunca sabe dónde vive el backend.
 */

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

/** Códigos que devuelve la API en el campo `error`. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "USERNAME_TAKEN"
  | "EMAIL_TAKEN"
  | "INVALID_TOKEN"
  | "EXPIRED_TOKEN"
  | "EMPTY_CART"
  | "ORDER_NOT_FOUND"
  | "UNEXPECTED";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly fields?: Record<string, string>,
  ) {
    super(`${status} ${code}`);
    this.name = "ApiError";
  }
}

type ErrorBody = {
  status?: number;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

async function request<T>(
  path: string,
  init: RequestInit & { token?: string },
): Promise<T | null> {
  const { token, ...rest } = init;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
      // Nada de esto se cachea: son credenciales y datos de sesión.
      cache: "no-store",
    });
  } catch {
    // La API no responde (apagada, puerto equivocado). Para quien llama es un
    // fallo más, con el mismo código que cualquier otro imprevisto.
    throw new ApiError(0, "UNEXPECTED");
  }

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body ?? {}) as ErrorBody;
    throw new ApiError(
      response.status,
      (error.error as ApiErrorCode) ?? "UNEXPECTED",
      error.fields,
    );
  }

  return body as T;
}

export function apiPost<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T | null> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body), token });
}

export function apiGet<T>(path: string, token?: string): Promise<T | null> {
  return request<T>(path, { method: "GET", token });
}

// --- Formas que devuelve la API ---

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  username: string;
  roles: string[];
};

export type MeResponse = {
  username: string;
  enabled: boolean;
  roles: string[];
};

export type UserResponse = {
  id: number;
  username: string;
  email: string;
  roles: string[];
};

// --- Pedidos ---

export type OrderStatus = "PREPARING" | "SHIPPED" | "DELIVERED";

export type OrderItemResponse = {
  productId: number;
  title: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  lineTotal: number;
};

/** Lo que devuelve la lista: sin líneas. `itemCount` cuenta productos distintos,
 *  no unidades — la cantidad se ve al abrir el detalle. */
export type OrderSummaryResponse = {
  id: number;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetailResponse = {
  id: number;
  status: OrderStatus;
  total: number;
  recipientName: string;
  address: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
};

/** Lo que viaja en `POST /api/orders`. Nunca lleva un id de usuario: quién pide
 *  lo dice el token, y un campo así permitiría pedir en nombre de otro. */
export type CreateOrderRequest = {
  items: Array<{
    productId: number;
    title: string;
    unitPrice: number;
    quantity: number;
    imageUrl?: string;
  }>;
  recipientName: string;
  address: string;
  phone: string;
  /** Idioma del correo de confirmación, no de la respuesta: la API no tiene i18n. */
  locale: string;
};

export function createOrder(
  body: CreateOrderRequest,
  token: string,
): Promise<OrderDetailResponse | null> {
  return apiPost<OrderDetailResponse>("/api/orders", body, token);
}

/** Los pedidos del que llama, del más nuevo al más viejo. No hay endpoint que
 *  devuelva los de otro, así que aquí no se filtra nada por usuario. */
export function getMyOrders(token: string): Promise<OrderSummaryResponse[] | null> {
  return apiGet<OrderSummaryResponse[]>("/api/orders", token);
}

/** Un pedido ajeno responde 404, igual que uno inexistente: la comprobación de
 *  propiedad la hace Spring, no esta capa. */
export function getMyOrder(
  id: number,
  token: string,
): Promise<OrderDetailResponse | null> {
  return apiGet<OrderDetailResponse>(`/api/orders/${id}`, token);
}
