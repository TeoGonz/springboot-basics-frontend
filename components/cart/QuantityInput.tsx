"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";

/** Lo que se espera a que el usuario deje de teclear antes de enviar. */
const DEBOUNCE_MS = 500;

/** Nada a lo que suscribirse: esto no cambia después de montar. */
const subscribe = () => () => {};

type Props = {
  id: string;
  max: number;
  quantity: number;
  label: string;
  /** Texto del botón de reserva, el que se usa sin JavaScript. */
  updateLabel: string;
};

/**
 * La cantidad de una línea del carrito: se guarda sola.
 *
 * El envío lo dispara el propio campo, no un botón. Se espera medio segundo
 * desde la última tecla porque `onChange` salta con cada una: sin esa espera,
 * escribir `12` mandaría dos peticiones y la primera guardaría `1`. Las flechas
 * del campo pasan por el mismo camino, así que un clic también guarda.
 *
 * Un campo vacío no se envía. Vaciarlo para escribir otro número no es pedir que
 * se borre el producto — eso lo pide el `0`, que es lo que anuncia el `min`.
 *
 * El botón sigue existiendo **sin JavaScript**: se pinta en el servidor y solo
 * desaparece cuando el componente ha montado, que es la prueba de que el envío
 * automático puede funcionar. Sin esa prueba, quitarlo dejaría un carrito en el
 * que la cantidad no se puede cambiar.
 */
export default function QuantityInput({
  id,
  max,
  quantity,
  label,
  updateLabel,
}: Props) {
  const { pending } = useFormStatus();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `false` en el servidor, `true` en el navegador: la diferencia entre las dos
  // instantáneas *es* la comprobación de que hay JavaScript ejecutándose.
  const automatic = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function schedule(input: HTMLInputElement) {
    if (timer.current) clearTimeout(timer.current);
    if (input.value.trim() === "") return;

    const form = input.form;
    timer.current = setTimeout(() => form?.requestSubmit(), DEBOUNCE_MS);
  }

  return (
    <>
      <div>
        <label htmlFor={id} className="mb-1 block text-xs text-slate-500">
          {label}
        </label>
        <input
          id={id}
          name="quantity"
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          defaultValue={quantity}
          aria-busy={pending}
          onChange={(event) => schedule(event.currentTarget)}
          className="focus:border-brand focus:ring-brand/30 w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring-2 aria-busy:opacity-60"
        />
      </div>

      {!automatic && (
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition hover:bg-slate-100"
        >
          {updateLabel}
        </button>
      )}
    </>
  );
}
