"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import type { Dictionary, MessageKey } from "@/lib/i18n";

/**
 * Validación en el navegador para los formularios de autenticación.
 *
 * Las reglas son las mismas funciones de `lib/validation.ts` que usa la acción
 * de servidor: esto es comodidad, no control. Quien decide sigue siendo el
 * servidor, y con JavaScript apagado el formulario funciona igual.
 *
 * Los campos son controlados por dos motivos: para poder validar al salir del
 * campo, y porque React vacía un formulario no controlado en cuanto la acción
 * termina — el error del servidor aparecía sobre las casillas en blanco.
 */

/** El segundo argumento permite comparar contra otro campo (confirmar contraseña). */
export type Rule = (
  value: string,
  values: Record<string, string>,
) => MessageKey | null;

type Options = {
  rules: Record<string, Rule>;
  /** Errores por campo que devolvió la acción, ya en forma de clave. */
  serverErrors?: Record<string, MessageKey>;
  t: Dictionary;
};

export type FieldProps = {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string;
};

export function useValidatedForm({ rules, serverErrors, t }: Options) {
  const names = Object.keys(rules);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(names.map((name) => [name, ""])),
  );
  /** Un campo solo enseña errores cuando ya se ha visitado o se ha enviado. */
  const [live, setLive] = useState<Record<string, boolean>>({});
  /** Campos editados desde la última respuesta: su error de servidor caducó. */
  const [stale, setStale] = useState<Record<string, boolean>>({});

  // Una respuesta nueva de la acción es un objeto nuevo. Cuando llega, los
  // errores del servidor vuelven a ser actuales para todos los campos.
  const [lastResponse, setLastResponse] = useState(serverErrors);
  if (lastResponse !== serverErrors) {
    setLastResponse(serverErrors);
    setStale({});
  }

  function errorKeyOf(name: string): MessageKey | undefined {
    // El error del servidor no espera a nada: ya hubo un envío. Es lo único que
    // se ve cuando el navegador no ejecuta JavaScript.
    const fromServer = stale[name] ? undefined : serverErrors?.[name];
    if (!live[name]) return fromServer;
    return rules[name](values[name] ?? "", values) ?? fromServer;
  }

  function fieldProps(name: string): FieldProps {
    const key = errorKeyOf(name);
    return {
      name,
      value: values[name] ?? "",
      onChange: (event) => {
        setValues((current) => ({ ...current, [name]: event.target.value }));
        setStale((current) => ({ ...current, [name]: true }));
      },
      onBlur: () => setLive((current) => ({ ...current, [name]: true })),
      error: key && t[key],
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setLive(Object.fromEntries(names.map((name) => [name, true])));

    const invalid = names.filter((name) => rules[name](values[name] ?? "", values));
    if (invalid.length === 0) return;

    // Cancela el envío: con `action` en el formulario, `preventDefault` impide
    // que React llegue a ejecutar la acción.
    event.preventDefault();
    // `Field` usa el nombre como `id`, así que el primer campo malo se enfoca.
    document.getElementById(invalid[0])?.focus();
  }

  return { fieldProps, handleSubmit };
}
