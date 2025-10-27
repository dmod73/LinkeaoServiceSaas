"use client";

import { useFormState, useFormStatus } from "react-dom";
import styles from "../../styles/sections.module.css";

export type PasswordFormState = { success?: string; error?: string };

type Props = {
  action: (_state: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
};

const INITIAL_STATE: PasswordFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.passwordButton} disabled={pending}>
      {pending ? "Actualizando..." : "Actualizar contraseña"}
    </button>
  );
}

export function ChangePasswordForm({ action }: Props) {
  const [state, formAction] = useFormState(action, INITIAL_STATE);

  return (
    <form className={styles.passwordForm} action={formAction}>
      <label>
        <span>Nueva contraseña</span>
        <input
          type="password"
          name="newPassword"
          minLength={12}
          placeholder="Minimo 12 caracteres"
          autoComplete="new-password"
          required
        />
      </label>
      <label>
        <span>Confirmar contraseña</span>
        <input
          type="password"
          name="confirmPassword"
          minLength={12}
          placeholder="Repite la nueva contraseña"
          autoComplete="new-password"
          required
        />
      </label>
      {state.error ? <p className={styles.passwordMessageError}>{state.error}</p> : null}
      {state.success ? <p className={styles.passwordMessageSuccess}>{state.success}</p> : null}
      <SubmitButton />
    </form>
  );
}
