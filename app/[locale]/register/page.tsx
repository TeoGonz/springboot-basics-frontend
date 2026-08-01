import { notFound, redirect } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import RegisterForm from "@/components/auth/RegisterForm";
import PublicNav from "@/components/PublicNav";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export default async function RegisterPage({
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
        title={t["auth.register.title"]}
        subtitle={t["auth.register.subtitle"]}
        footer={{
          text: t["auth.register.haveAccount"],
          linkLabel: t["auth.register.signIn"],
          href: `/${locale}/login`,
        }}
      >
        <RegisterForm locale={locale} t={t} />
      </AuthCard>
    </>
  );
}
