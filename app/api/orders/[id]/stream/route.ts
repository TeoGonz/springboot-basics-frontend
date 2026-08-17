import { openOrderStream } from "@/lib/api";
import { getSession } from "@/lib/session";

/**
 * Proxy del stream de estado de un pedido: `EventSource` en el navegador de un
 * lado, el SSE de Spring del otro.
 *
 * **Por qué existe.** `EventSource` acepta una URL y nada más — no hay forma de
 * ponerle una cabecera `Authorization` — y el JWT vive en una cookie `httpOnly`
 * que ningún script puede leer. Las dos alternativas son peores: meter el token
 * en la query (queda en cada log de acceso, en el historial y en el `Referer`) o
 * abrir la API al navegador, que obliga a un bean de CORS que este proyecto no
 * tiene por decisión, no por olvido. Aquí el token no sale del proceso de Node.
 *
 * Vive en `app/api/` y no en `app/[locale]/api/`: un segmento estático gana al
 * dinámico en el enrutado de Next, así que `/api/...` nunca llega a `[locale]`.
 * El stream no lleva prosa, luego no tiene idioma.
 *
 * No decide nada sobre permisos. Reenvía la petición con el token y Spring
 * contesta 404 a un pedido ajeno, igual que a `GET /api/orders/{id}`.
 */

// Un stream no se cachea ni se prerenderiza.
export const dynamic = "force-dynamic";

function jsonError(status: number, code: string) {
  return new Response(JSON.stringify({ status, error: code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getSession();
  // Nunca una redirección a `/login`: un `EventSource` no la sigue de forma
  // útil, se quedaría reintentando contra una página HTML.
  if (!session) return jsonError(401, "UNAUTHENTICATED");

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    // Sin esto, un id que no es número manda `/api/orders/NaN/stream` a Spring.
    return jsonError(404, "ORDER_NOT_FOUND");
  }

  let upstream: Response;
  try {
    upstream = await openOrderStream(numericId, session.token, request.signal);
  } catch {
    // Puede ser que la API esté caída, o que el navegador se haya ido mientras
    // se abría. Las dos acaban igual: no hay stream. `EventSource` reintenta.
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return jsonError(503, "UNEXPECTED");
  }

  if (!upstream.ok || !upstream.body) {
    // El cuerpo de error de la API pasa tal cual, así que `ORDER_NOT_FOUND`
    // sobrevive el salto y el navegador ve el estado de verdad.
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  }

  // El cuerpo se devuelve sin tocar: el marcado SSE ya sale bien de Spring y
  // este handler no tiene motivo para entenderlo. `no-transform` porque un
  // proxy que comprime un stream retiene frames esperando a llenar su búfer, y
  // eso convierte un canal en vivo en uno con retraso.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
