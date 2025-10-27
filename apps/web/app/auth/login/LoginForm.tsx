"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import styles from "../auth.module.css";

type Status = "idle" | "loading" | "success" | "error";

type State = {
  status: Status;
  message?: string;
};

type Props = {
  initialSuccess?: string;
};

export function LoginForm({ initialSuccess }: Props) {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (initialSuccess) {
      setState({ status: "success", message: initialSuccess });
    }
  }, [initialSuccess]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setState({ status: "loading" });

    try {
      const redirectTo =
        process.env.NEXT_PUBLIC_AUTH_REDIRECT ?? `${window.location.origin}/auth/callback`;
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, redirectTo })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos iniciar sesion.");
      }

      form.reset();
      setState({ status: "success", message: payload.message ?? "Magic link enviado. Revisa tu correo." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos iniciar sesion.";
      setState({ status: "error", message });
    }
  };

  const isLoading = state.status === "loading";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="login-email">
          Email
        </label>
        <input
          className={styles.input}
          id="login-email"
          name="email"
          type="email"
          placeholder="tu-negocio@email.com"
          required
          disabled={isLoading}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="login-password">
          Password
        </label>
        <input
          className={styles.input}
          id="login-password"
          name="password"
          type="password"
          placeholder="Minimo 8 caracteres"
          minLength={8}
          required
          disabled={isLoading}
        />
        <p className={styles.helper}>Validamos tu password antes de enviar el magic link seguro.</p>
      </div>
      {state.status === "success" ? (
        <p className={`${styles.status} ${styles.statusSuccess}`}>{state.message}</p>
      ) : null}
      {state.status === "error" ? (
        <p className={`${styles.status} ${styles.statusError}`}>{state.message}</p>
      ) : null}
      <button className={`${styles.button} ${styles.primary} ${styles.submit}`} type="submit" disabled={isLoading}>
        {isLoading ? "Enviando magic link..." : "Enviar magic link"}
      </button>
    </form>
  );
}
