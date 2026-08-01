import Link from "next/link";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Pie opcional: pregunta + enlace ("¿Ya tienes cuenta? Inicia sesión"). */
  footer?: { text?: string; linkLabel: string; href: string };
};

/**
 * Marco común de las pantallas de autenticación: fondo con el degradado del
 * hero y una tarjeta blanca con la misma forma que las de la bitácora.
 */
export default function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <main className="bg-linear-135 from-hero-1 from-0% via-hero-2 via-55% to-hero-3 flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.25)]">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">{subtitle}</p>

        {children}

        {footer && (
          <p className="mt-6 text-center text-sm text-slate-500">
            {footer.text}{" "}
            <Link
              href={footer.href}
              className="text-brand font-medium hover:underline"
            >
              {footer.linkLabel}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
