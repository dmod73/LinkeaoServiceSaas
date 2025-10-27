import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@ui/shared";
import styles from "../styles/overview.module.css";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { listTenantModules } from "@/lib/features/moduleAccess";

export const revalidate = 0;

function formatActiveModules(names: string[]): string {
  if (!names.length) {
    return "Todavia no tienes módulos activos. Actívalos desde la tienda para comenzar.";
  }
  if (names.length === 1) {
    return `Tienes 1 módulo activo: ${names[0]}.`;
  }
  const allButLast = names.slice(0, -1).join(", ");
  const last = names[names.length - 1];
  return `Tienes ${names.length} módulos activos: ${allButLast} y ${last}.`;
}

export default async function DashboardOverviewPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/auth/login");

  const modules = await listTenantModules();
  const active = modules.filter((module) => module.enabled);

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <div>
            <h2>Resumen de módulos</h2>
            <p>{formatActiveModules(active.map((module) => module.name))}</p>
          </div>
          <Link className={styles.manageLink} href="/dashboard/modules">
            Gestionar módulos
          </Link>
        </header>
        <div className={styles.grid}>
          {modules.map((module) => (
            <Card
              key={module.id}
              className={`${styles.card} ${module.enabled ? styles.cardEnabled : styles.cardDisabled}`.trim()}
            >
              <div className={styles.cardHeader}>
                <h3>{module.name}</h3>
                <span className={styles.status} data-enabled={module.enabled}>
                  {module.enabled ? "Activo" : "Apagado"}
                </span>
              </div>
              <p className={styles.description}>{module.description || "Sin descripción disponible."}</p>
              <span className={styles.meta}>{module.isFree ? "Incluido sin costo" : "Módulo premium"}</span>
            </Card>
          ))}
          {!modules.length ? (
            <Card className={styles.card}>
              <h3>Sin módulos configurados</h3>
              <p className={styles.description}>
                Cuando publiquemos nuevos módulos aparecerán aquí. Mientras tanto, revisa la tienda para conocer lo que
                está por venir.
              </p>
            </Card>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.todoTitle}>Próximos pasos sugeridos</h3>
        <ul className={styles.todoList}>
          <li>Activa LinkService para crear tu link-in-bio profesional y compartir tus canales.</li>
          <li>Configura el slug del tenant y prepara dominios personalizados para cada negocio.</li>
          <li>Invita a tu equipo y asigna roles antes de habilitar nuevos módulos.</li>
        </ul>
      </section>
    </div>
  );
}
