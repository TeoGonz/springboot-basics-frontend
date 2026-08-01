"use client";

import { useActionState } from "react";
import { BsEnvelope, BsLock, BsPerson } from "react-icons/bs";

import { register } from "@/app/actions/auth";
import Field from "@/components/auth/Field";
import FormError from "@/components/auth/FormError";
import SubmitButton from "@/components/auth/SubmitButton";
import type { Dictionary, Locale } from "@/lib/i18n";

export default function RegisterForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, action] = useActionState(register, undefined);
  const errors = state?.fieldErrors;

  return (
    <form action={action} noValidate>
      <input type="hidden" name="locale" value={locale} />

      {state?.errorKey && <FormError message={t[state.errorKey]} />}

      <Field
        name="username"
        label={t["login.username"]}
        icon={BsPerson}
        autoComplete="username"
        error={errors?.username && t[errors.username]}
      />
      <Field
        name="email"
        label={t["auth.field.email"]}
        type="email"
        icon={BsEnvelope}
        autoComplete="email"
        error={errors?.email && t[errors.email]}
      />
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

      <SubmitButton label={t["auth.register.submit"]} />
    </form>
  );
}
