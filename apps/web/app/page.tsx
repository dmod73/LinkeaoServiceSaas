import Link from "next/link";
import Image from "next/image";
import { Card } from "@ui/shared";
import { SignOutButton } from "./components/SignOutButton";
import { SignedOutBanner } from "./components/SignedOutBanner";
import styles from "./landing.module.css";
import { getCurrentUser } from "@/lib/auth/currentUser";

const NAVIGATION = [
  { label: "Para negocios", href: "#solucion" },
  { label: "Modulos", href: "#modulos" },
  { label: "Como funciona", href: "#como-funciona" }
] as const;

const HIGHLIGHTS = [
  "Marca propia sin depender de codigo",
  "Reservas y pagos conectados",
  "Magic link seguro para tu equipo"
] as const;

const MODULES = [
  {
    title: "Experiencia de marca",
    description: "Disena una pagina con tu logo, paleta y dominios personalizados para cada unidad de negocio.",
    icon: "module-brand.svg"
  },
  {
    title: "Reservas en tiempo real",
    description: "Gestiona agendas, disponibilidad y recordatorios automaticos desde un solo panel.",
    icon: "module-booking.svg"
  },
  {
    title: "Cobros sin friccion",
    description: "Envia cotizaciones, cobra con confianza y sigue el estado de cada pago sin hojas de calculo.",
    icon: "module-payments.svg"
  }
] as const;

const STEPS = [
  {
    title: "Configura tu cuenta",
    description: "Define tu negocio, equipo y dominios. Todo listo en minutos, sin implementaciones largas."
  },
  {
    title: "Activa los modulos clave",
    description: "Elige landing, reservas y cobros segun la etapa de tu negocio."
  },
  {
    title: "Escala tu servicio",
    description: "Comparte tu portal, automatiza procesos y enfocate en brindar experiencias memorables."
  }
] as const;

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System admin",
  admin: "Admin",
  member: "Member"
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const signedOut = params?.signedOut === "1";
  const showSignedOutBanner = signedOut && params?.dismissBanner !== "1";
  const currentUser = await getCurrentUser();
  const roleLabel = currentUser ? ROLE_LABELS[currentUser.role] ?? currentUser.role : null;
  const userInitial = currentUser?.fullName?.charAt(0) ?? currentUser?.email.charAt(0) ?? "?";

  return (
    <main className={styles.landing}>
      {showSignedOutBanner ? (
        <section className={styles.alert} role="status" aria-live="polite">
          <div className={styles.alertIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Zm3.707-11.707-4.243 4.243-1.414-1.414a1 1 0 0 0-1.414 1.414l2.121 2.121a1 1 0 0 0 1.414 0l4.95-4.95a1 1 0 0 0-1.414-1.414Z"
              />
            </svg>
          </div>
          <div className={styles.alertBody}>
            <span className={styles.alertTitle}>Sesion cerrada</span>
            <p className={styles.alertDescription}>Puedes volver a entrar cuando quieras.</p>
          </div>
          <div className={styles.alertActions}>
            <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/auth/login">
              Volver a entrar
            </Link>
            <Link className={`${styles.button} ${styles.buttonGhost}`} href="/?dismissBanner=1">
              Seguir navegando
            </Link>
          </div>
        </section>
      ) : null}
      <header className={styles.navbar}>
        <Link className={styles.brand} href="/">
          <span className={styles.logo}>Linkeao Service</span>
          <span className={styles.tag}>Micro SaaS</span>
        </Link>
        <input className={styles.navToggle} id="nav-toggle" type="checkbox" aria-label="Abrir menu" />
        <label className={styles.navToggleButton} htmlFor="nav-toggle">
          <span />
          <span />
          <span />
        </label>
        <nav className={styles.navLinks}>
          {NAVIGATION.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.navCtas}>
          {currentUser ? (
            <div className={styles.navUser}>
              <div className={styles.navUserBadge}>
                <span className={styles.navUserAvatar}>{userInitial.toUpperCase()}</span>
                <div className={styles.navUserDetails}>
                  <span>{currentUser.email}</span>
                  <span>{roleLabel}</span>
                </div>
              </div>
              <div className={styles.navUserActions}>
                <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/dashboard">
                  Mi panel
                </Link>
                <SignOutButton className={`${styles.button} ${styles.buttonGhost}`} label="Cerrar sesion" />
              </div>
            </div>
          ) : (
            <>
              <Link className={`${styles.button} ${styles.buttonGhost}`} href="/auth/login">
                Entrar
              </Link>
              <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/auth/signup">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      <section className={styles.hero} id="solucion">
        <div className={styles.heroCopy}>
          <span className={styles.pill}>Disenado para negocios que inspiran</span>
          <h1>Lanza, agenda y cobra en un mismo lugar con una experiencia a la medida de tu marca.</h1>
          <p>
            Linkeao Service Micro SaaS te da un portal moderno para recibir reservas, mostrar tus servicios y cobrar sin
            friccion. Activa solo lo que necesitas y escala cuando tu negocio este listo.
          </p>
          <div className={styles.heroActions}>
            {currentUser ? (
              <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/dashboard">
                Ir al panel
              </Link>
            ) : (
              <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/auth/signup">
                Comenzar gratis
              </Link>
            )}
          </div>
          <ul className={styles.heroHighlights}>
            {HIGHLIGHTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className={styles.heroMedia}>
          <div className={styles.heroArt}>
            <Image
              src="/hero-showcase.svg"
              alt="Resumen de modulos Linkeao"
              fill
              priority
              sizes="(max-width: 768px) 90vw, 400px"
            />
          </div>
        </div>
      </section>

      <section className={styles.modules} id="modulos">
        <header>
          <h2>Todo lo que tus clientes esperan, conectado en un mismo lugar</h2>
          <p>
            Cada modulo de Linkeao Service esta disenado para que tu negocio se sienta cercano, confiable y siempre
            disponible.
          </p>
        </header>
        <div className={styles.modulesGrid}>
          {MODULES.map((module) => (
            <Card key={module.title} className={styles.moduleCard}>
              <div className={styles.moduleIcon}>
                <Image src={`/${module.icon}`} alt={module.title} width={64} height={64} />
              </div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.process} id="como-funciona">
        <header>
          <h2>Tres pasos para una experiencia que enamora</h2>
          <p>
            Empieza con tu cuenta, activa los modulos y deja que Linkeao Service haga el trabajo pesado mientras tu te
            enfocas en tu talento.
          </p>
        </header>
        <div className={styles.processGrid}>
          {STEPS.map((step, index) => (
            <Card key={step.title} className={styles.processCard}>
              <span className={styles.processIndex}>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <span className={styles.logo}>Linkeao Service</span>
          <p>
            La forma mas sencilla de ofrecer experiencias digitales consistentes, sorprendentes y faciles de operar.
          </p>
        </div>
        <div className={styles.footerActions}>
          {currentUser ? (
            <>
              <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/dashboard">
                Ir al panel
              </Link>
              <SignOutButton className={`${styles.button} ${styles.buttonGhost}`} label="Cerrar sesion" />
            </>
          ) : (
            <>
              <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/auth/signup">
                Crear cuenta ahora
              </Link>
              <Link className={`${styles.button} ${styles.buttonGhost}`} href="/auth/login">
                Ingresar
              </Link>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}




