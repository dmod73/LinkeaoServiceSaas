import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { fetchAppointmentDashboardData } from "@/lib/features/appointments/dashboard";
import { AppointmentsDashboardClient } from "./Client";
import styles from "./appointments.module.css";

export const revalidate = 0;

export default async function AppointmentsDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const data = await fetchAppointmentDashboardData();

  if (!data.enabled) {
    return (
      <section className={styles.inactive}>
        <h1>Módulo Appointments</h1>
        <p>
          Activa el módulo Appointments para gestionar la agenda, disponibilidad y reportes. Puedes habilitarlo desde la
          tienda de módulos.
        </p>
        <Link href="/dashboard/modules" className={styles.activateLink}>
          Ir a módulos
        </Link>
      </section>
    );
  }

  return <AppointmentsDashboardClient initialData={data} tenantId={currentUser.tenantId || currentUser.id} />;
}
