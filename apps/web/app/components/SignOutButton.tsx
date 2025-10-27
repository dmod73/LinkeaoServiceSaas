"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SignOutButton.module.css";
import { useToast } from "./ToastProvider";

type Props = {
  className?: string;
  label?: string;
  redirectTo?: string;
};

type Status = "idle" | "loading" | "success" | "error";

export function SignOutButton({
  className = "",
  label = "Cerrar sesion",
  redirectTo = "/?signedOut=1"
}: Props) {
  const router = useRouter();
  const { success, error } = useToast();
  const [status, setStatus] = useState<Status>("idle");

  const handleClick = async () => {
    if (status === "loading") return;
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "No pudimos cerrar la sesion.");
      }
      setStatus("success");
      success("Sesion cerrada", { position: "top-right" });
      router.replace(redirectTo);
      router.refresh();
    } catch (caught) {
      setStatus("error");
      const message = caught instanceof Error ? caught.message : "No pudimos cerrar la sesion.";
      error(message, { position: "top-right" });
      console.error("[signout] error", caught);
    }
  };

  const isLoading = status === "loading";

  return (
    <div className={styles.wrapper}>
      <button className={className} type="button" onClick={handleClick} disabled={isLoading}>
        {isLoading ? "Saliendo..." : label}
      </button>
    </div>
  );
}
