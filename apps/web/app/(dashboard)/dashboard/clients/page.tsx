import Link from "next/link";
import styles from "../../styles/sections.module.css";

export default function ClientsPage() {
  return (
    <div className={styles.placeholder}>
      <div>
        <h1>Clientes y equipos</h1>
        <p>Muy pronto podras segmentar clientes por tenant, asignar roles y monitorear actividad del equipo.</p>
        <Link href="/dashboard">Volver al resumen</Link>
      </div>
    </div>
  );
}
