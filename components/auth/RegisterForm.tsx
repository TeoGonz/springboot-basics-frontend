"use client";

import { useActionState } from "react";
import { BsEnvelope, BsLock, BsPerson } from "react-icons/bs";

import { register } from "@/app/actions/auth";
import Field from "@/components/auth/Field";
import FormError from "@/components/auth/FormError";
import SubmitButton from "@/components/auth/SubmitButton";
import type { Dictionary, Locale } from "@/lib/i18n";
import { useValidatedForm } from "@/lib/useValidatedForm";
import {
  validateEmail,
  validateMatch,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

/**
 * Las mismas reglas que aplica la acción, sobre los mismos valores: usuario y
 * correo van recortados porque el servidor también los recorta antes de
 * validarlos, y la contraseña no, porque un espacio ahí cuenta.
 */
const rules = {
  username: (value: string) => validateUsername(value.trim()),
  email: (value: string) => validateEmail(value.trim()),
  password: (value: string) => validatePassword(value),
  confirmPassword: (value: string, values: Record<string, string>) =>
    validateMatch(values.password ?? "", value),
};

export default function RegisterForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, action] = useActionState(register, undefined);
  const { fieldProps, handleSubmit } = useValidatedForm({
    rules,
    serverErrors: state?.fieldErrors,
    t,
  });

  return (
    <form action={action} onSubmit={handleSubmit} noValidate>
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
        {...fieldProps("email")}
        label={t["auth.field.email"]}
        type="email"
        icon={BsEnvelope}
        autoComplete="email"
        required
      />
      <Field
        {...fieldProps("password")}
        label={t["login.password"]}
        type="password"
        icon={BsLock}
        autoComplete="new-password"
        required
      />
      <Field
        {...fieldProps("confirmPassword")}
        label={t["auth.field.confirmPassword"]}
        type="password"
        icon={BsLock}
        autoComplete="new-password"
        required
      />

      <SubmitButton label={t["auth.register.submit"]} />
    </form>
  );
}
