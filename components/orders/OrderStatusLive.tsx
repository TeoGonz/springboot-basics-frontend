"use client";

import { useEffect, useState } from "react";

import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderStatusSteps from "@/components/orders/OrderStatusSteps";
import {
  ORDER_STATUS_ORDER,
  type OrderStatus,
  type OrderStatusEvent,
} from "@/lib/api";
import { formatDateTime, type Dictionary, type Locale } from "@/lib/i18n";

type Connection = "idle" | "live" | "off";

/** ¿`next` va por delante de `current` en el mapa? Un estado desconocido queda
 *  en -1, así que cualquiera lo adelanta y la pantalla nunca se queda anclada. */
function advances(current: OrderStatus, next: OrderStatus): boolean {
  return ORDER_STATUS_ORDER.indexOf(next) > ORDER_STATUS_ORDER.indexOf(current);
}

/**
 * Cabecera y mapa de progreso de un pedido, moviéndose solos.
 *
 * Abre un `EventSource` contra `/api/orders/{id}/stream` —el handler de Next,
 * nunca Spring: el navegador no sabe dónde vive la API ni tiene con qué
 * autenticarse— y repinta el estado en cuanto un administrador lo mueve.
 *
 * **Es una mejora, no un requisito.** Al ser un componente de cliente se
 * renderiza igualmente en el servidor, así que sin JavaScript se ve el mismo
 * mapa, la misma fecha y la misma nota de recargar que antes de este cambio.
 *
 * La cabecera entra aquí con el mapa a propósito. Dejarla en el servidor sería
 * una frontera de cliente más pequeña, pero también dejaría dos etiquetas de
 * estado en la misma pantalla diciendo cosas distintas: la viva bajo el mapa y
 * una congelada junto al `<h1>`.
 */
export default function OrderStatusLive({
  orderId,
  createdAtLabel,
  initialStatus,
  initialUpdatedAtLabel,
  locale,
  t,
}: {
  orderId: number;
  /** Ya formateada en el servidor: no cambia nunca. */
  createdAtLabel: string;
  initialStatus: OrderStatus;
  /**
   * También formateada en el servidor, y por el mismo motivo que el resto de
   * fechas del proyecto: formatear en el navegador con otra zona horaria daría
   * un texto distinto al del HTML inicial y React lo cantaría como desajuste de
   * hidratación. Las que llegan por evento sí se formatean aquí — para entonces
   * ya no hay HTML del servidor con el que discrepar.
   */
  initialUpdatedAtLabel: string;
  locale: Locale;
  t: Dictionary;
}) {
  const [progress, setProgress] = useState({
    status: initialStatus,
    updatedAt: initialUpdatedAtLabel,
  });
  const [connection, setConnection] = useState<Connection>("idle");

  useEffect(() => {
    // `DELIVERED` es terminal: no hay nada que esperar, así que no se abre nada.
    if (initialStatus === "DELIVERED") return;

    const source = new EventSource(`/api/orders/${orderId}/stream`);

    source.addEventListener("open", () => setConnection("live"));

    // Por nombre de evento y no `onmessage`: así el comentario del latido y
    // cualquier tipo de evento futuro no entran por aquí.
    source.addEventListener("status", (event) => {
      let next: OrderStatusEvent;
      try {
        next = JSON.parse((event as MessageEvent<string>).data);
      } catch {
        return;
      }

      // Estado y fecha se deciden juntos y en forma funcional: son una sola
      // verdad, y así el listener no depende del render en que se registró.
      // El mapa no retrocede nunca, aunque llegue una frame vieja o desordenada.
      setProgress((current) =>
        advances(current.status, next.status)
          ? { status: next.status, updatedAt: formatDateTime(next.at, locale) }
          : current,
      );

      // Spring completa el stream al llegar a `DELIVERED`. Si no se cierra
      // aquí, `EventSource` ve la conexión caída, reconecta sola, recibe otro
      // `DELIVERED`, vuelve a caer — cada tres segundos y para siempre.
      if (next.status === "DELIVERED") {
        source.close();
        setConnection("idle");
      }
    });

    // Un `error` no es un fallo: `EventSource` lo lanza en cada corte y
    // reconecta sola, también tras el tope de 15 minutos del backend, cuya
    // reconexión es invisible porque la primera frame siempre es el estado
    // actual. Solo `CLOSED` significa que se ha rendido.
    source.addEventListener("error", () => {
      setConnection(source.readyState === EventSource.CLOSED ? "off" : "idle");
    });

    return () => source.close();
  }, [orderId, initialStatus, locale]);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">#{orderId}</h1>
        <OrderStatusBadge status={progress.status} t={t} />
        <p className="text-sm text-slate-500">{createdAtLabel}</p>
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-6 font-semibold">{t["orders.progress"]}</h2>
        <OrderStatusSteps status={progress.status} t={t} />
        <p className="mt-6 text-sm text-slate-500">
          {t["orders.lastUpdate"]} {progress.updatedAt}
        </p>

        {progress.status === "DELIVERED" ? null : connection === "live" ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
            {/* El color no es el único portador del estado: la frase la lee un
                lector de pantalla y el punto es decoración. */}
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            />
            {t["orders.live"]}
            <span className="sr-only"> — {t["orders.live.body"]}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            {connection === "off"
              ? t["orders.live.off"]
              : t["orders.note.reload"]}
          </p>
        )}
      </section>
    </>
  );
}
