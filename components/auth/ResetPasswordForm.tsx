"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BsCheckCircle, BsLock } from "react-icons/bs";

import { resetPassword } from "@/app/actions/auth";
import Field from "@/components/auth/Field";
import FormError from "@/components/auth/FormError";
import SubmitButton from "@/components/auth/SubmitButton";
import type { Dictionary, Locale } from "@/lib/i18n";

export default function ResetPasswordForm({
  locale,
  token,
  t,
}: {
  locale: Locale;
  /** Llega en la query del enlace del correo. */
  token: string;
  t: Dictionary;
}) {
  const [state, action] = useActionState(resetPassword, undefined);
  const errors = state?.fieldErrors;

  if (state?.done) {
    return (
      <div>
        <p className="flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <BsCheckCircle aria-hidden className="mt-0.5 shrink-0" />
          {t["auth.reset.done"]}
        </p>
        <Link
          href={`/${locale}/login`}
          className="text-brand mt-4 inline-block text-sm font-medium hover:underline"
        >
          {t["auth.reset.goToLogin"]}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />

      {state?.errorKey && <FormError message={t[state.errorKey]} />}

      <Field
        name="password"
        label={t["login.password"]}
        type="password"
        icon={BsLock}
        autoComplete="new-password"
        error={errors?.password && t[errors.password]}
      />
      <Field
        name="confirmPassword"
        label={t["auth.field.confirmPassword"]}
        type="password"
        icon={BsLock}
        autoComplete="new-password"
        error={errors?.confirmPassword && t[errors.confirmPassword]}
      />

      <SubmitButton label={t["auth.reset.submit"]} />
    </form>
  );
}
