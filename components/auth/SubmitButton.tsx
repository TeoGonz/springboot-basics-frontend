"use client";

import { useFormStatus } from "react-dom";

/**
 * Botón de envío que se deshabilita mientras la acción está en vuelo.
 * `useFormStatus` solo funciona dentro del `<form>`, así que va en su propio
 * componente y no en el formulario que lo contiene.
 */
export default function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-linear-90 from-brand to-brand-2 w-full rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
