import Link from "next/link";
import styles from "../auth.module.css";
import { MagicForm } from "./MagicForm";

export default function MagicPage() {
  return (
    <div className={styles.layout}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1>Solicita tu magic link</h1>
          <p>Te enviaremos un enlace seguro despues de verificar que tu cuenta existe.</p>
        </header>
        <MagicForm />
        <footer className={styles.footer}>
          <span>Necesitas crear una cuenta primero?</span>
          <Link href="/auth/signup">Crear cuenta</Link>
        </footer>
      </div>
    </div>
  );
}
