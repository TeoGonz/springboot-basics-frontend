import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BsClipboardCheck,
  BsShieldCheck,
  BsShieldExclamation,
  BsShieldLock,
} from "react-icons/bs";

import PublicNav from "@/components/PublicNav";
import { apiGet, type MeResponse } from "@/lib/api";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getSession } from "@/lib/session";

/** El rol que abre esta página. Tal cual lo devuelve la API, con prefijo. */
const ADMIN_ROLE = "ROLE_ADMIN";

/**
 * Zona de administración: ruta protegida por rol.
 *
 * <p>El rol no se saca del JWT aquí — se pregunta a `GET /api/me` con el token
 * de la cookie, así que quién eres lo sigue decidiendo Spring, que es quien
 * firmó el token. Esta página solo decide qué pintar.
 *
 * <p>Ojo con lo que esto es y lo que no: esta comprobación decide **qué se
 * pinta**, y nada más. Es cosmética. Los datos de verdad no están aquí — están
 * en `/admin/orders`, que llama a `/api/admin/orders` y deja que Spring conteste
 * 403 si el token no lleva el rol. Las dos capas son distintas y ninguna sobra:
 * esta evita enseñar una pantalla que no va a funcionar, la otra es la barrera.
 */
export default async function AdminPage({
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
    // Mismo criterio que /account: la cookie parecía viva pero la API rechaza
    // el token. No se manda a /login, que con la cookie ahí volveríamos aquí
    // en bucle. Y no es una denegación de rol: la API caída no es un permiso.
    me = null;
  }

  const isAdmin = me?.roles.includes(ADMIN_ROLE) ?? false;

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-12">
        <div className="mx-auto w-full max-w-2xl px-4">
          <h1 className="mb-1 text-3xl font-bold">{t["admin.title"]}</h1>
          <p className="mb-6 text-slate-500">{t["admin.subtitle"]}</p>

          {me === null ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t["auth.account.invalidSession"]}
            </p>
          ) : isAdmin ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="mb-4 flex items-center gap-2 text-lg">
                <BsShieldCheck aria-hidden className="text-brand" />
                <span>
                  {t["admin.greeting"]}, <strong>{me.username}</strong>
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

              <Link
                href={`/${locale}/admin/orders`}
                className="border-brand/30 hover:bg-brand/5 mb-6 flex items-center gap-3 rounded-xl border p-4 transition"
              >
                <BsClipboardCheck aria-hidden className="text-brand text-xl" />
                <span>
                  <span className="block font-semibold">
                    {t["admin.orders.link"]}
                  </span>
                  <span className="block text-sm text-slate-500">
                    {t["admin.orders.link.body"]}
                  </span>
                </span>
              </Link>

              <p className="text-sm text-slate-500">{t["admin.note"]}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <BsShieldExclamation aria-hidden className="text-amber-600" />
                {t["denied.title"]}
              </p>

              <p className="mb-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t["denied.body.pre"]} <strong>{me.username}</strong>{" "}
                {t["denied.body.post"]}
              </p>

              <Link
                href={`/${locale}/account`}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
              >
                {t["denied.back"]}
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
