import Link from "next/link";
import styles from "../auth.module.css";
import { LoginForm } from "./LoginForm";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const signupParam = params.signup;
  const fromSignup = typeof signupParam === "string" ? signupParam : undefined;
  const initialSuccess =
    fromSignup === "success" ? "Cuenta creada. Inicia sesion y envia tu magic link." : undefined;

  return (
    <div className={styles.layout}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1>Inicia sesion</h1>
          <p>Valida tus credenciales y te enviaremos un magic link seguro a tu email.</p>
        </header>
        <LoginForm initialSuccess={initialSuccess} />
        <footer className={styles.footer}>
          <span>Necesitas una cuenta?</span>
          <Link href="/auth/signup">Crear cuenta</Link>
        </footer>
      </div>
    </div>
  );
}
