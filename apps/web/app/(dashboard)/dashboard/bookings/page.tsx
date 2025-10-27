import Link from "next/link";
import styles from "../../styles/sections.module.css";

export default function BookingsPage() {
  return (
    <div className={styles.placeholder}>
      <div>
        <h1>Reservas en progreso</h1>
        <p>En la Fase 2 podras crear flujos de reservas, agendas multi-tenant y recordatorios automaticos.</p>
        <Link href="/dashboard">Volver al resumen</Link>
      </div>
    </div>
  );
}


