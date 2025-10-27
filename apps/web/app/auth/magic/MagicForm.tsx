"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import styles from "../auth.module.css";

type Status = "idle" | "loading" | "success" | "error";

type State = {
  status: Status;
  message?: string;
};

export function MagicForm() {
  const [state, setState] = useState<State>({ status: "idle" });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();

    setState({ status: "loading" });

    try {
      const redirectTo =
        process.env.NEXT_PUBLIC_AUTH_REDIRECT ?? `${window.location.origin}/auth/callback`;
      const response = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos enviar el magic link.");
      }

      form.reset();
      setState({
        status: "success",
        message: payload.message ?? "Magic link enviado. Revisa tu correo."
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos enviar el magic link.";
      setState({ status: "error", message });
    }
  };

  const isLoading = state.status === "loading";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="magic-email">
          Email
        </label>
        <input
          className={styles.input}
          id="magic-email"
          name="email"
          type="email"
          placeholder="tu-negocio@email.com"
          required
          disabled={isLoading}
        />
        <p className={styles.helper}>Solo enviamos el enlace si existe una cuenta activa para este email.</p>
      </div>
      {state.status === "success" ? (
        <p className={`${styles.status} ${styles.statusSuccess}`}>{state.message}</p>
      ) : null}
      {state.status === "error" ? (
        <p className={`${styles.status} ${styles.statusError}`}>{state.message}</p>
      ) : null}
      <button className={`${styles.button} ${styles.primary} ${styles.submit}`} type="submit" disabled={isLoading}>
        {isLoading ? "Enviando..." : "Enviar magic link"}
      </button>
    </form>
  );
}
