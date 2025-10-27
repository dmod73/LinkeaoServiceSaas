"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./TenantSlugForm.module.css";
import { useToast } from "../../../components/ToastProvider";

const SLUG_REGEX = /^[a-z0-9-]{3,}$/;

type Props = {
  tenantId: string;
  currentSlug: string;
};

export function TenantSlugForm({ tenantId, currentSlug }: Props) {
  const router = useRouter();
  const { success, error } = useToast();
  const [value, setValue] = useState(currentSlug);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = SLUG_REGEX.test(value) && value !== currentSlug;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus("saving");
    setMessage(null);

    try {
      const res = await fetch("/api/tenant/slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTenantId: tenantId, desiredSlug: value })
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "No pudimos actualizar el slug.");
      }

      setStatus("success");
      setMessage("Slug actualizado correctamente.");
      success("Slug actualizado", { position: "top-right" });
      router.replace(`/dashboard/settings?updatedSlug=1&slug=${payload.slug}`);
      router.refresh();
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "No pudimos actualizar el slug.";
      setStatus("error");
      setMessage(errorMessage);
      error(errorMessage, { position: "top-right" });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="tenant-slug">
        Slug del tenant
      </label>
      <div className={styles.inputGroup}>
        <span className={styles.prefix}>https://</span>
        <input
          id="tenant-slug"
          name="slug"
          value={value}
          onChange={(event) => setValue(event.target.value.toLowerCase())}
          minLength={3}
          pattern="[a-z0-9-]+"
          required
        />
        <span className={styles.suffix}>.tu-dominio.com</span>
      </div>
      <p className={styles.helper}>Solo letras minusculas, numeros y guiones. Minimo 3 caracteres.</p>
      <button className={styles.submit} type="submit" disabled={status === "saving" || !canSubmit}>
        {status === "saving" ? "Guardando..." : "Guardar slug"}
      </button>
      {message ? (
        <p
          className={`${styles.message} ${status === "error" ? styles.messageError : styles.messageSuccess}`.trim()}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
