"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../auth.module.css";

type Status = "idle" | "loading" | "success" | "error";

type State = {
  status: Status;
  message?: string;
};

export function SignupForm() {
  const [state, setState] = useState<State>({ status: "idle" });
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password !== confirm) {
      setState({ status: "error", message: "Las passwords no coinciden." });
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos crear la cuenta.");
      }

      form.reset();
      setState({
        status: "success",
        message: payload.message ?? "Cuenta creada. Ahora te llevamos al login."
      });

      setTimeout(() => {
        router.push("/auth/login?signup=success");
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos crear la cuenta.";
      setState({ status: "error", message });
    }
  };

  const isLoading = state.status === "loading";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="signup-name">
          Nombre del negocio o responsable
        </label>
        <input
          className={styles.input}
          id="signup-name"
          name="fullName"
          type="text"
          placeholder="Ej. Studio Creativo Linkeao"
          maxLength={120}
          disabled={isLoading}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="signup-email">
          Email
        </label>
        <input
          className={styles.input}
          id="signup-email"
          name="email"
          type="email"
          placeholder="tu-negocio@email.com"
          required
          disabled={isLoading}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="signup-password">
          Password
        </label>
        <input
          className={styles.input}
          id="signup-password"
          name="password"
          type="password"
          placeholder="Minimo 8 caracteres"
          minLength={8}
          required
          disabled={isLoading}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="signup-confirm">
          Confirmar password
        </label>
        <input
          className={styles.input}
          id="signup-confirm"
          name="confirm"
          type="password"
          placeholder="Repite la password"
          minLength={8}
          required
          disabled={isLoading}
        />
      </div>
      {state.status === "success" ? (
        <p className={`${styles.status} ${styles.statusSuccess}`}>{state.message}</p>
      ) : null}
      {state.status === "error" ? (
        <p className={`${styles.status} ${styles.statusError}`}>{state.message}</p>
      ) : null}
      <button className={`${styles.button} ${styles.primary} ${styles.submit}`} type="submit" disabled={isLoading}>
        {isLoading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
