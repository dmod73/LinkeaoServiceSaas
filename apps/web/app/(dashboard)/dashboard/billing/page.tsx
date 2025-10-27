import Link from "next/link";
import styles from "../../styles/sections.module.css";

export default function BillingPage() {
  return (
    <div className={styles.placeholder}>
      <div>
        <h1>Pagos y facturacion</h1>
        <p>Gestiona suscripciones, facturas y pasarelas de pago en la Fase 2 del proyecto.</p>
        <Link href="/dashboard">Volver al resumen</Link>
      </div>
    </div>
  );
}
