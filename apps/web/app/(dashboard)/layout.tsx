import type { ReactNode } from "react";
import { SignOutButton } from "../components/SignOutButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./layout.module.css";
import { DashboardNav } from "./components/DashboardNav";
import { getDashboardNavItems } from "./components/navLinks";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { listTenantModules } from "@/lib/features/moduleAccess";

const QUICK_ACTIONS = [
  { label: "Inicio", href: "/" }
];

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System admin",
  admin: "Admin",
  member: "Member"
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const tenantModules = await listTenantModules();
  const activeModules = tenantModules.filter((module) => module.enabled);
  const activeModuleLabels = activeModules.map((module) => module.name);
  const linkServiceEnabled = activeModules.some((module) => module.id === "linkservice");
  const invoiceEnabled = activeModules.some((module) => module.id === "appointments");
  const invoicingEnabled = activeModules.some((module) => module.id === "invoicing");
  const navLinks = getDashboardNavItems({
    showAdmin: currentUser.isPlatformAdmin,
    enableLinkService: linkServiceEnabled,
    enableInvoice: invoiceEnabled,
    enableInvoicing: invoicingEnabled,
    activeModuleLabels
  });
  const roleLabel = ROLE_LABELS[currentUser.role] ?? currentUser.role;
  const displayName = currentUser.fullName || currentUser.email;
  const email = currentUser.email;
  const avatarFallback = displayName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/">
          <span>Linkeao Service</span>
          <span>Panel del negocio</span>
        </Link>
        <DashboardNav
          showAdmin={currentUser.isPlatformAdmin}
          enableLinkService={linkServiceEnabled}
          enableInvoice={invoiceEnabled}
          enableInvoicing={invoicingEnabled}
          activeModuleLabels={activeModuleLabels}
        />
      </aside>
      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.topMeta}>
            <div className={styles.user}>
              <div className={styles.userAvatar}>
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={displayName ?? email} />
                ) : (
                  avatarFallback
                )}
              </div>
              <div className={styles.userControls}>
                <div className={styles.userDetails}>
                  <span>{email}</span>
                  <span>{roleLabel}</span>
                </div>
                <SignOutButton className={`${styles.button} ${styles.buttonGhost}`} label="Cerrar sesion" />
              </div>
            </div>
          </div>
          <div className={styles.topActionsRow}>
            <div className={styles.topActionsDesktop}>
              {QUICK_ACTIONS.map((action) => (
                <Link key={action.label} className={styles.button} href={action.href}>
                  {action.label}
                </Link>
              ))}
              <Link className={`${styles.button} ${styles.buttonPrimary}`.trim()} href="/dashboard">
                Mi panel
              </Link>
            </div>
            <details className={styles.topActionsMobile}>
              <summary>Mi panel</summary>
              <div className={styles.topActionsMobileList}>
                {QUICK_ACTIONS.map((action) => (
                  <Link key={`mobile-${action.label}`} className={styles.button} href={action.href}>
                    {action.label}
                  </Link>
                ))}
                <Link className={`${styles.button} ${styles.buttonPrimary}`.trim()} href="/dashboard">
                  Mi panel
                </Link>
              </div>
              <div className={`${styles.topActionsMobileList} ${styles.topActionsMobileNav}`}>
                {navLinks.map((item) => (
                  <Link key={`mobile-nav-${item.href}`} className={styles.button} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}



