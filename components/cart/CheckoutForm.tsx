"use client";

import { useActionState } from "react";
import { BsGeoAlt, BsPerson, BsTelephone } from "react-icons/bs";

import { placeOrder } from "@/app/actions/cart";
import Field from "@/components/auth/Field";
import FormError from "@/components/auth/FormError";
import SubmitButton from "@/components/auth/SubmitButton";
import type { Dictionary, Locale } from "@/lib/i18n";
import { useValidatedForm } from "@/lib/useValidatedForm";
import {
  validateAddress,
  validatePhone,
  validateRecipientName,
} from "@/lib/validation";

/**
 * Datos de envío.
 *
 * Es el único control de esta pantalla que no es un `<form>` de servidor pelado:
 * los errores por campo tienen que volver a pintarse bajo su casilla, y eso
 * exige quedarse con lo que devuelve la acción. Mismo patrón que los cuatro
 * formularios de `components/auth/`, con las mismas reglas de
 * `lib/validation.ts` a los dos lados. Sin JavaScript el envío sigue llegando a
 * la acción y los mensajes se pintan igual.
 *
 * El carrito no entra aquí: la acción lo lee de la cookie en el servidor.
 */
export default function CheckoutForm({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const [state, action] = useActionState(placeOrder, undefined);
  const { fieldProps, handleSubmit } = useValidatedForm({
    rules: {
      recipientName: validateRecipientName,
      address: validateAddress,
      phone: validatePhone,
    },
    serverErrors: state?.fieldErrors,
    t,
  });

  return (
    <form action={action} onSubmit={handleSubmit} noValidate>
      {/* La acción no sabe en qué idioma está la página; el campo se lo dice, y
          de ahí sale también el idioma del correo de confirmación. */}
      <input type="hidden" name="locale" value={locale} />

      {state?.errorKey && <FormError message={t[state.errorKey]} />}

      <Field
        {...fieldProps("recipientName")}
        label={t["checkout.field.recipientName"]}
        icon={BsPerson}
        autoComplete="name"
        required
      />
      <Field
        {...fieldProps("address")}
        label={t["checkout.field.address"]}
        icon={BsGeoAlt}
        autoComplete="street-address"
        required
      />
      <Field
        {...fieldProps("phone")}
        label={t["checkout.field.phone"]}
        icon={BsTelephone}
        autoComplete="tel"
        required
      />

      <SubmitButton label={t["checkout.submit"]} />
    </form>
  );
}
