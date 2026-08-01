import type { IconType } from "react-icons";

type Props = {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  icon: IconType;
  /** Mensaje ya traducido; si llega, la casilla se marca en rojo. */
  error?: string;
  autoComplete?: string;
  defaultValue?: string;
};

/** Casilla de formulario: etiqueta, icono, campo y línea de error. */
export default function Field({
  name,
  label,
  type = "text",
  icon: Icon,
  error,
  autoComplete,
  defaultValue,
}: Props) {
  const errorId = `${name}-error`;

  return (
    <div className="mb-4">
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>

      <div className="relative">
        <Icon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
        />
        <input
          id={name}
          name={name}
          type={type}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`focus:border-brand focus:ring-brand/30 w-full rounded-md border py-2 pr-3 pl-9 text-sm outline-none focus:ring-2 ${
            error ? "border-red-500" : "border-slate-300"
          }`}
        />
      </div>

      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
