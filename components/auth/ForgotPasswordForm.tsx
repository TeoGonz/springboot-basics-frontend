"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BsCheckCircle, BsEnvelope } from "react-icons/bs";

import { forgotPassword } from "@/app/actions/auth";
import Field from "@/components/auth/Field";
import FormError from "@/components/auth/FormError";
import SubmitButton from "@/components/auth/SubmitButton";
import type { Dictionary, Locale } from "@/lib/i18n";

export default function ForgotPasswordForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, action] = useActionState(forgotPassword, undefined);

  // Estado final: se sustituye el formulario. Volver a enviarlo no aportaría
  // nada, y el mensaje es el mismo exista o no la cuenta.
  if (state?.done) {
    return (
      <div>
        <p className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <BsCheckCircle aria-hidden className="mt-0.5 shrink-0" />
          {t["auth.forgot.sent"]}
        </p>
        <Link
          href={`/${locale}/login`}
          className="text-brand mt-4 inline-block text-sm font-medium hover:underline"
        >
          {t["auth.forgot.backToLogin"]}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} noValidate>
      <input type="hidden" name="locale" value={locale} />

      {state?.errorKey && <FormError message={t[state.errorKey]} />}

      <Field
        name="email"
        label={t["auth.field.email"]}
        type="email"
        icon={BsEnvelope}
        autoComplete="email"
        error={state?.fieldErrors?.email && t[state.fieldErrors.email]}
      />

      <SubmitButton label={t["auth.forgot.submit"]} />
    </form>
  );
}
