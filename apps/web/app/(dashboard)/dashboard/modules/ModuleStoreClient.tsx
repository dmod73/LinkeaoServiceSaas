"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./module-store.module.css";
import { useToast } from "../../../components/ToastProvider";

type ModuleSummary = {
  id: string;
  name: string;
  description: string;
  isFree: boolean;
  enabled: boolean;
  plan?: string;
};

type Props = {
  modules: ModuleSummary[];
  canManage: boolean;
  onToggle: (moduleId: string, enabled: boolean) => Promise<void>;
};

export function ModuleStoreClient({ modules: initialModules, canManage, onToggle }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [modules, setModules] = useState(initialModules);
  const [loadingModuleId, setLoadingModuleId] = useState<string | null>(null);

  const handleToggle = async (moduleId: string, enabled: boolean) => {
    setLoadingModuleId(moduleId);
    try {
      setModules((current) => current.map((module) => (module.id === moduleId ? { ...module, enabled } : module)));
      await onToggle(moduleId, enabled);
      router.refresh();
      toast.success(enabled ? "Modulo habilitado" : "Modulo deshabilitado", { position: "top-right" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos actualizar el modulo";
      setModules((current) => current.map((module) => (module.id === moduleId ? { ...module, enabled: !enabled } : module)));
      toast.error(message, { position: "top-right" });
    } finally {
      setLoadingModuleId(null);
    }
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Modulos</h1>
          <p>Descubre funcionalidades adicionales para tu tenant. Activa LinkService gratis u otros modulos segun tu plan.</p>
        </div>
      </header>
      {!canManage ? (
        <p className={styles.permissionHint}>
          Necesitas rol <strong>admin</strong> o <strong>system admin</strong> para habilitar modulos en este negocio.
        </p>
      ) : null}
      <section className={styles.grid}>
        {modules.map((module) => (
          <article key={module.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>{module.name.charAt(0)}</div>
              <div>
                <strong>{module.name}</strong>
                <span>{module.isFree ? "Incluido sin costo" : "Modulo premium"}</span>
              </div>
              <span className={`${styles.badge} ${module.isFree ? styles.freeBadge : ""}`}>
                {module.isFree ? "Gratis" : module.plan ?? "Pronto"}
              </span>
            </div>
            <div className={styles.cardBody}>
              <p>{module.description}</p>
              <div className={styles.statusBar}>
                <div className={`${styles.toggleSwitch} ${module.enabled ? styles.toggleActive : ""}`}></div>
                <span>{module.enabled ? "Activo" : "Apagado"}</span>
              </div>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => handleToggle(module.id, !module.enabled)}
                disabled={loadingModuleId === module.id || !canManage}
              >
                {module.enabled ? "Deshabilitar" : "Habilitar"}
              </button>
              <button type="button" className={styles.secondaryButton} disabled>
                Detalles
              </button>
            </div>
          </article>
        ))}
        {!modules.length && <p className={styles.emptyState}>No encontramos modulos disponibles por ahora.</p>}
      </section>
    </div>
  );
}
