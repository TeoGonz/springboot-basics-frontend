import { notFound, redirect } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import LoginForm from "@/components/auth/LoginForm";
import PublicNav from "@/components/PublicNav";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  // Con sesión viva no hay nada que hacer aquí. `getSession` descarta el token
  // caducado, así que esto no rebota contra /account con una cookie muerta.
  if (await getSession()) redirect(`/${locale}/account`);

  const t = getDictionary(locale);

  return (
    <>
      <PublicNav locale={locale} t={t} />
      <AuthCard
        title={t["login.title"]}
        subtitle={t["auth.login.subtitle"]}
        footer={{
          text: t["auth.login.noAccount"],
          linkLabel: t["auth.login.createAccount"],
          href: `/${locale}/register`,
        }}
      >
        <LoginForm locale={locale} t={t} />
      </AuthCard>
    </>
  );
}
