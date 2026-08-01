import Link from "next/link";
import { notFound } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import PublicNav from "@/components/PublicNav";
import { getDictionary, hasLocale } from "@/lib/i18n";

/**
 * Destino del enlace del correo. No comprueba la sesión: quien no puede entrar
 * es justo quien llega aquí.
 */
export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { token } = await searchParams;
  const t = getDictionary(locale);

  return (
    <>
      <PublicNav locale={locale} t={t} />
      <AuthCard
        title={t["auth.reset.title"]}
        subtitle={t["auth.reset.subtitle"]}
      >
        {token ? (
          <ResetPasswordForm locale={locale} token={token} t={t} />
        ) : (
          // Sin token no hay formulario que ofrecer: se llegó aquí a mano o el
          // enlace del correo se cortó al copiarlo.
          <div>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t["auth.reset.missingToken"]}
            </p>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-brand mt-4 inline-block text-sm font-medium hover:underline"
            >
              {t["auth.forgot.title"]}
            </Link>
          </div>
        )}
      </AuthCard>
    </>
  );
}
