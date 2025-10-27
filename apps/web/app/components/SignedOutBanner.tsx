"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./SignedOutBanner.module.css";

type Props = {
  message?: string;
};

export function SignedOutBanner({ message = "Sesion cerrada." }: Props) {
  const router = useRouter();

  const handleDismiss = useCallback(() => {
    router.replace("/");
    router.refresh();
  }, [router]);

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <div>
        <strong>{message}</strong>
        <span>Puedes volver a entrar cuando quieras.</span>
      </div>
      <div className={styles.actions}>
        <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/auth/login">
          Volver a entrar
        </Link>
        <button
          className={`${styles.button} ${styles.buttonGhost}`}
          type="button"
          onClick={handleDismiss}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
