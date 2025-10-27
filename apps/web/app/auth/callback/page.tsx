"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import styles from "../auth.module.css";

type Status = "loading" | "success" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Validando tu enlace seguro...");

  useEffect(() => {
    async function handleMagicLink() {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      if (error) {
        setStatus("error");
        setMessage(errorDescription ?? "El enlace expiro o ya fue usado. Solicita uno nuevo.");
        return;
      }

      if (!accessToken || !refreshToken) {
        setStatus("error");
        setMessage("Enlace invalido. Solicita un nuevo magic link.");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        setStatus("error");
        setMessage(sessionError.message ?? "No pudimos activar tu sesion. Solicita un nuevo magic link.");
        return;
      }

      const response = await fetch("/api/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStatus("error");
        setMessage(payload?.error ?? "No pudimos sincronizar tu sesion. Intenta otra vez.");
        return;
      }

      setStatus("success");
      setMessage("Sesion iniciada. Redirigiendo a tu panel...");

      setTimeout(() => {
        router.replace("/dashboard");
      }, 800);
    }

    handleMagicLink();
  }, [router]);

  return (
    <div className={styles.layout}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1>Procesando tu acceso</h1>
          <p>Estamos validando el magic link de Supabase.</p>
        </header>
        <div className={styles.form}>
          <p
            className={`${styles.status} ${
              status === "success" ? styles.statusSuccess : status === "error" ? styles.statusError : ""
            }`}
          >
            {message}
          </p>
          {status === "error" ? (
            <a className={`${styles.button} ${styles.primary}`} href="/auth/login">
              Volver al login
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
