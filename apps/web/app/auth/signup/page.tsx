import Link from "next/link";
import styles from "../auth.module.css";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className={styles.layout}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1>Crea tu cuenta Linkeao</h1>
          <p>Configura tu negocio, habilita modulos y comienza a recibir clientes hoy mismo.</p>
        </header>
        <SignupForm />
        <footer className={styles.footer}>
          <span>Ya tienes cuenta?</span>
          <Link href="/auth/login">Entrar</Link>
        </footer>
      </div>
    </div>
  );
}
