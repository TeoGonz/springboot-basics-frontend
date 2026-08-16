import { BsBoxSeam, BsCheck2Circle, BsTruck } from "react-icons/bs";

import type { OrderStatus } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n";

/** El orden del mapa es el orden del enum en la API, que solo avanza. */
const STEPS = [
  { status: "PREPARING", icon: BsBoxSeam },
  { status: "SHIPPED", icon: BsTruck },
  { status: "DELIVERED", icon: BsCheck2Circle },
] as const;

type State = "done" | "current" | "pending";

const CIRCLE: Record<State, string> = {
  done: "bg-brand text-white",
  current: "bg-brand text-white ring-brand/25 ring-4",
  pending: "border border-slate-200 bg-slate-100 text-slate-400",
};

const LABEL: Record<State, string> = {
  done: "text-slate-900",
  current: "font-semibold text-slate-900",
  pending: "text-slate-400",
};

/**
 * Mapa de progreso del pedido: tres pasos, tres estados por paso.
 *
 * Es un `<ol>` de tres `<li>` con iconos y tokens del tema, no una librería:
 * una barra de progreso son tres divs y una dependencia para eso sobraría.
 *
 * Estado → paso es una función total. Un estado desconocido deja los tres pasos
 * pendientes y enseña el valor crudo debajo, en vez de romper la página.
 */
export default function OrderStatusSteps({
  status,
  t,
}: {
  status: OrderStatus;
  t: Dictionary;
}) {
  const current = STEPS.findIndex((step) => step.status === status);

  return (
    <>
      <ol className="flex items-start">
        {STEPS.map((step, index) => {
          // El último paso, cuando es el actual, se marca hecho: `DELIVERED` es
          // terminal y no deja nada en curso. Sigue llevando `aria-current`,
          // que es dónde está el pedido, no qué falta.
          const terminal = index === STEPS.length - 1;
          const state: State =
            current < 0
              ? "pending"
              : index < current || (index === current && terminal)
                ? "done"
                : index === current
                  ? "current"
                  : "pending";

          const Icon = state === "done" ? BsCheck2Circle : step.icon;

          return (
            <li
              key={step.status}
              className="relative flex-1 text-center"
              aria-current={state === "current" ? "step" : undefined}
            >
              {/* Decoración: el <ol> ya dice cuál va antes de cuál. */}
              {index > 0 && (
                <span
                  aria-hidden
                  className={`absolute top-5 -left-1/2 -z-0 h-0.5 w-full ${
                    state === "pending" ? "bg-slate-200" : "bg-brand"
                  }`}
                />
              )}

              <span
                className={`relative z-10 mx-auto grid h-10 w-10 place-items-center rounded-full ${CIRCLE[state]}`}
              >
                <Icon aria-hidden />
              </span>

              <p className={`mt-2 px-1 text-sm ${LABEL[state]}`}>
                {t[`order.status.${step.status}`]}
                {/* El color no es el único portador del estado. */}
                <span className="sr-only"> — {t[`orders.step.${state}`]}</span>
              </p>
            </li>
          );
        })}
      </ol>

      {current < 0 && (
        <p className="mt-4 text-sm text-slate-500">
          {t["orders.status.unknown"]} <code>{status}</code>
        </p>
      )}
    </>
  );
}
