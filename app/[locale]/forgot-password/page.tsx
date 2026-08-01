import { notFound, redirect } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import PublicNav from "@/components/PublicNav";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  if (await getSession()) redirect(`/${locale}/account`);

  const t = getDictionary(locale);

  return (
    <>
      <PublicNav locale={locale} t={t} />
      <AuthCard
        title={t["auth.forgot.title"]}
        subtitle={t["auth.forgot.subtitle"]}
        footer={{
          linkLabel: t["auth.forgot.backToLogin"],
          href: `/${locale}/login`,
        }}
      >
        <ForgotPasswordForm locale={locale} t={t} />
      </AuthCard>
    </>
  );
}
