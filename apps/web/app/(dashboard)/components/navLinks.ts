export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const ADMIN_LINKS: NavItem[] = [{ label: "Usuarios", href: "/dashboard/admin/users", icon: "U" }];
const LINK_SERVICE_LINK: NavItem = { label: "LinkService", href: "/dashboard/linkservice", icon: "L" };

function buildSummaryLabel(activeModules: string[]): string {
  if (!activeModules.length) return "Resumen · 0 módulos activos";
  const count = activeModules.length;
  const modulesList = activeModules.join(", ");
  const plural = count > 1;
  return `Resumen · ${count} módulo${plural ? "s" : ""} activo${plural ? "s" : ""}: ${modulesList}`;
}

export function getDashboardNavItems({
  showAdmin = false,
  enableLinkService = false,
  activeModules = []
}: {
  showAdmin?: boolean;
  enableLinkService?: boolean;
  activeModules?: string[];
}): NavItem[] {
  const summary: NavItem = {
    label: buildSummaryLabel(activeModules),
    href: "/dashboard",
    icon: "R"
  };

  const base: NavItem[] = [
    summary,
    { label: "Módulos", href: "/dashboard/modules", icon: "M" },
    { label: "Configuración", href: "/dashboard/settings", icon: "S" }
  ];

  return [
    ...base,
    ...(enableLinkService ? [LINK_SERVICE_LINK] : []),
    ...(showAdmin ? ADMIN_LINKS : [])
  ];
}
