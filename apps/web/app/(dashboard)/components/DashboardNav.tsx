"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DashboardNav.module.css";
import { getDashboardNavItems } from "./navLinks";

type Props = {
  showAdmin?: boolean;
  enableLinkService?: boolean;
  activeModules?: string[];
};

export function DashboardNav({
  showAdmin = false,
  enableLinkService = false,
  activeModules = []
}: Props) {
  const pathname = usePathname();
  const links = getDashboardNavItems({ showAdmin, enableLinkService, activeModules });

  return (
    <nav className={styles.nav} aria-label="Secciones de Linkeao Service">
      <span className={styles.groupLabel}>Panel</span>
      <div className={styles.links}>
        {links.map((item) => {
          const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== "/dashboard");
          return (
            <Link
              key={item.href}
              className={`${styles.link} ${isActive ? styles.active : ""}`.trim()}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={`${styles.icon} ${isActive ? styles.iconActive : ""}`.trim()}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
