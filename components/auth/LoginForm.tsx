"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BsLock, BsPerson } from "react-icons/bs";

import { login } from "@/app/actions/auth";
import Field from "@/components/auth/Field";
import FormError from "@/components/auth/FormError";
import SubmitButton from "@/components/auth/SubmitButton";
import type { Dictionary, Locale } from "@/lib/i18n";

export default function LoginForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, action] = useActionState(login, undefined);

  return (
    <form action={action} noValidate>
      {/* La acción no sabe en qué idioma está la página; el campo se lo dice. */}
      <input type="hidden" name="locale" value={locale} />

      {state?.errorKey && <FormError message={t[state.errorKey]} />}

      <Field
        name="username"
        label={t["login.username"]}
        icon={BsPerson}
        autoComplete="username"
        error={
          state?.fieldErrors?.username && t[state.fieldErrors.username]
        }
      />
      <Field
        name="password"
        label={t["login.password"]}
        type="password"
        icon={BsLock}
        autoComplete="current-password"
        error={
          state?.fieldErrors?.password && t[state.fieldErrors.password]
        }
      />

      <SubmitButton label={t["login.submit"]} />

      <p className="mt-4 text-center text-sm">
        <Link
          href={`/${locale}/forgot-password`}
          className="text-slate-500 hover:underline"
        >
          {t["auth.login.forgot"]}
        </Link>
      </p>
    </form>
  );
}
