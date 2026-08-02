"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BsLock, BsPerson } from "react-icons/bs";

import { login } from "@/app/actions/auth";
import Field from "@/components/auth/Field";
import FormError from "@/components/auth/FormError";
import SubmitButton from "@/components/auth/SubmitButton";
import type { Dictionary, Locale } from "@/lib/i18n";
import { useValidatedForm } from "@/lib/useValidatedForm";

/**
 * Entrar solo exige que los dos campos vengan llenos. Aplicar aquí el formato
 * de usuario del registro publicaría cómo son los nombres válidos y dejaría
 * fuera a cuentas creadas antes de esa regla.
 */
const required = (value: string) =>
  value.trim() ? null : ("auth.validation.required" as const);

export default function LoginForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, action] = useActionState(login, undefined);
  const { fieldProps, handleSubmit } = useValidatedForm({
    rules: { username: required, password: required },
    serverErrors: state?.fieldErrors,
    t,
  });

  return (
    <form action={action} onSubmit={handleSubmit} noValidate>
      {/* La acción no sabe en qué idioma está la página; el campo se lo dice. */}
      <input type="hidden" name="locale" value={locale} />

      {state?.errorKey && <FormError message={t[state.errorKey]} />}

      <Field
        {...fieldProps("username")}
        label={t["login.username"]}
        icon={BsPerson}
        autoComplete="username"
        required
      />
      <Field
        {...fieldProps("password")}
        label={t["login.password"]}
        type="password"
        icon={BsLock}
        autoComplete="current-password"
        required
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
