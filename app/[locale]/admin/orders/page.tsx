import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BsBoxArrowInRight,
  BsClipboardCheck,
  BsShieldExclamation,
} from "react-icons/bs";

import { logout } from "@/app/actions/auth";
import type { AdminOrderErrorCode } from "@/app/actions/admin-orders";
import AdminOrderFilters from "@/components/admin/AdminOrderFilters";
import AdminOrderRow from "@/components/admin/AdminOrderRow";
import PublicNav from "@/components/PublicNav";
import {
  ApiError,
  getAllOrders,
  type AdminOrderSummaryResponse,
  type OrderStatus,
} from "@/lib/api";
import {
  getDictionary,
  hasLocale,
  type Dictionary,
  type MessageKey,
} from "@/lib/i18n";
import { getSession } from "@/lib/session";

const STATUSES: readonly OrderStatus[] = ["PREPARING", "SHIPPED", "DELIVERED"];

/** Códigos que la acción puede dejar en `?error=`, con su frase. */
const ERROR_KEYS: Record<AdminOrderErrorCode, MessageKey> = {
  UNAUTHENTICATED: "admin.orders.error.UNAUTHENTICATED",
  FORBIDDEN: "admin.orders.error.FORBIDDEN",
  ORDER_NOT_FOUND: "admin.orders.error.ORDER_NOT_FOUND",
  INVALID_STATUS_TRANSITION: "admin.orders.error.INVALID_STATUS_TRANSITION",
  VALIDATION_ERROR: "admin.orders.error.VALIDATION_ERROR",
  UNEXPECTED: "admin.orders.error.UNEXPECTED",
};

/** Un `?status=` que no sea uno de los tres se trata como ausente: pasárselo a
 *  la API sería un 400 por escribir mal una URL. */
function statusOf(value: string | undefined): OrderStatus | null {
  return STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : null;
}

function errorKeyOf(value: string | undefined, t: Dictionary): string | null {
  const key = ERROR_KEYS[value as AdminOrderErrorCode];
  return key ? t[key] : null;
}

const th = "px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase";

/**
 * Pedidos de todos, para el administrador: verlos y moverlos de estado.
 *
 * <p>La barrera es la API, no esta página. `/admin` comprueba el rol para
 * decidir qué pinta, y eso es cosmético — quien falsifique una cookie ve el
 * armazón. Aquí no hay comprobación de rol propia: se llama a
 * `/api/admin/orders` con el token y **Spring decide**. Un 403 se pinta como
 * denegación, que es la denegación de verdad y no una imitación de ella.
 *
 * <p>Sin paginar, porque la API no pagina. Sin sondeo: la tabla se actualiza al
 * enviar el formulario, que es cuando algo cambia.
 */
export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { status, error } = await searchParams;
  const t = getDictionary(locale);
  const filter = statusOf(status);
  const message = errorKeyOf(error, t);

  const session = await getSession();

  let orders: AdminOrderSummaryResponse[] | null = null;
  let denied = false;
  let expired = false;
  let failed = false;

  if (session) {
    try {
      orders = await getAllOrders(session.token, filter ?? undefined);
    } catch (caught) {
      if (!(caught instanceof ApiError)) failed = true;
      else if (caught.status === 403) denied = true;
      else if (caught.status === 401) expired = true;
      else failed = true;
    }
  }

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <main className="flex-1 py-10">
        <div className="mx-auto w-full max-w-5xl px-4">
          <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold">
            <BsClipboardCheck aria-hidden className="text-brand" />
            {t["admin.orders.title"]}
          </h1>
          <p className="mb-8 text-slate-500">{t["admin.orders.subtitle"]}</p>

          {!session ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center">
              <h2 className="mb-2 text-xl font-bold">
                {t["orders.signIn.title"]}
              </h2>
              <p className="mb-6 text-slate-500">{t["admin.orders.signIn"]}</p>
              <Link
                href={`/${locale}/login`}
                className="bg-linear-90 from-brand to-brand-2 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                <BsBoxArrowInRight aria-hidden />
                {t["orders.signIn.link"]}
              </Link>
            </div>
          ) : denied ? (
            // Esto no lo decide un `if` de esta página: lo contestó la API.
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <BsShieldExclamation aria-hidden className="text-amber-600" />
                {t["denied.title"]}
              </p>
              <p className="mb-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t["admin.orders.denied"]}
              </p>
              <Link
                href={`/${locale}/account`}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
              >
                {t["denied.back"]}
              </Link>
            </div>
          ) : expired ? (
            <>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t["auth.account.invalidSession"]}
              </p>
              <form action={logout} className="mt-4">
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-100"
                >
                  {t["common.logout"]}
                </button>
              </form>
            </>
          ) : failed ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t["admin.orders.error.UNEXPECTED"]}
            </p>
          ) : (
            <>
              {/* El resultado del último cambio, que viaja en la query porque un
                  formulario de servidor no puede contestarle a su página. */}
              {message && (
                <p
                  role="status"
                  className="mb-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
                >
                  {message}
                </p>
              )}

              <AdminOrderFilters locale={locale} t={t} status={filter} />

              {!orders || orders.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
                  {t["admin.orders.empty"]}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full border-collapse">
                    <caption className="sr-only">
                      {t["admin.orders.title"]}
                    </caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <tr>
                        <th scope="col" className={th}>
                          {t["admin.orders.col.id"]}
                        </th>
                        <th scope="col" className={th}>
                          {t["admin.orders.col.user"]}
                        </th>
                        <th scope="col" className={th}>
                          {t["admin.orders.col.date"]}
                        </th>
                        <th scope="col" className={th}>
                          {t["admin.orders.col.status"]}
                        </th>
                        <th scope="col" className={th}>
                          {t["admin.orders.col.lines"]}
                        </th>
                        <th scope="col" className={th}>
                          {t["admin.orders.col.total"]}
                        </th>
                        <th scope="col" className={th}>
                          {t["admin.orders.col.action"]}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <AdminOrderRow
                          key={order.id}
                          order={order}
                          locale={locale}
                          filter={filter}
                          t={t}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-4 text-xs text-slate-400">
                {t["admin.orders.note"]}
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
