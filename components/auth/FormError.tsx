import { BsExclamationTriangle } from "react-icons/bs";

/** Aviso de error general del formulario, sobre las casillas. */
export default function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <BsExclamationTriangle aria-hidden className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}
