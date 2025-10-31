import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@ui/shared";
import styles from "../styles/overview.module.css";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { listTenantModules } from "@/lib/features/moduleAccess";

export const revalidate = 0;

// No-op: summary will not show module count or names
function formatActiveModules(labels: string[]): string {
  return "";
}

export default async function DashboardOverviewPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/auth/login");

  const modules = await listTenantModules();
  const active = modules.filter((module) => module.enabled);
  const activeLabels = active.map((module) => module.name);
  const linkServiceModule = modules.find((module) => module.id === "linkservice");
  const invoiceModule = modules.find((module) => module.id === "invoice");

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <div>
            <h2>Resumen de modulos</h2>
            {/* No summary text, just the heading */}
          </div>
          <Link className={styles.manageLink} href="/dashboard/modules">
            Gestionar modulos
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
              <p className={styles.description}>{module.description || "Sin descripcion disponible."}</p>
              <span className={styles.meta}>{module.isFree ? "Incluido sin costo" : "Modulo premium"}</span>
            </Card>
          ))}
          {!modules.length ? (
            <Card className={styles.card}>
              <h3>Sin modulos configurados</h3>
              <p className={styles.description}>
                Cuando publiquemos nuevos modulos apareceran aqui. Mientras tanto, revisa la tienda para conocer lo que
                esta por venir.
              </p>
            </Card>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.todoTitle}>Proximos pasos sugeridos</h3>
        <ul className={styles.todoList}>
          {linkServiceModule?.enabled ? (
            <li>Personaliza LinkService con tu marca y comparte tu pagina publica.</li>
          ) : (
            <li>Activa LinkService para crear tu link-in-bio profesional y compartir tus canales.</li>
          )}
          {invoiceModule?.enabled ? (
            <li>Configura tus servicios, disponibilidad y descansos en el módulo Appointments.</li>
          ) : (
            <li>Activa Appointments para recibir reservas, definir servicios y gestionar tus citas.</li>
          )}
          <li>Invita a tu equipo y asigna roles antes de habilitar nuevos modulos.</li>
        </ul>
      </section>
    </div>
  );
}
