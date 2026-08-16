import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BsPersonCheck, BsReceipt, BsShieldLock } from "react-icons/bs";

import { logout } from "@/app/actions/auth";
import PublicNav from "@/components/PublicNav";
import { apiGet, type MeResponse } from "@/lib/api";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

/**
 * Zona privada mínima: enseña lo que `GET /api/me` responde con el token de la
 * cookie. Sirve para comprobar de una mirada que la sesión funciona de punta a
 * punta.
 */
export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const t = getDictionary(locale);

  let me: MeResponse | null = null;
  try {
    me = await apiGet<MeResponse>("/api/me", session.token);
  } catch {
    // El token parecía vivo pero la API lo rechaza (usuario borrado, secreto
    // rotado). No se redirige a /login: la cookie sigue ahí y volveríamos aquí
    // en bucle. Se muestra el estado y se deja cerrar sesión a mano.
    me = null;
  }

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-12">
        <div className="mx-auto w-full max-w-2xl px-4">
          <h1 className="mb-1 text-3xl font-bold">{t["user.title"]}</h1>
          <p className="mb-6 text-slate-500">{t["auth.account.subtitle"]}</p>

          {me ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="mb-4 flex items-center gap-2 text-lg">
                <BsPersonCheck aria-hidden className="text-brand" />
                <span>
                  {t["user.greeting"]}, <strong>{me.username}</strong>
                </span>
              </p>

              <p className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                <BsShieldLock aria-hidden />
                {t["user.roles"]}
              </p>
              <ul className="mb-6 flex flex-wrap gap-2">
                {me.roles.map((role) => (
                  <li
                    key={role}
                    className="bg-brand rounded-full px-2 py-1 text-xs tracking-wide text-white uppercase"
                  >
                    {role}
                  </li>
                ))}
              </ul>

              <p className="mb-6 text-sm text-slate-500">{t["user.note"]}</p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/orders`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
                >
                  <BsReceipt aria-hidden />
                  {t["orders.accountLink"]}
                </Link>

                {/* Visible con cualquier rol a propósito: que un USER lo pulse y
                    se tope con la denegación es lo que enseña el guard. */}
                <Link
                  href={`/${locale}/admin`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
                >
                  <BsShieldLock aria-hidden />
                  {t["auth.account.adminLink"]}
                </Link>
              </div>
            </div>
          ) : (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t["auth.account.invalidSession"]}
            </p>
          )}

          <form action={logout} className="mt-6">
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
            >
              {t["common.logout"]}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
