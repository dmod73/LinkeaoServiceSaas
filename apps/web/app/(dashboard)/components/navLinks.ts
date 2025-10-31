export type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const ADMIN_LINKS: NavItem[] = [{ label: "Usuarios", href: "/dashboard/admin/users", icon: "U" }];
const LINK_SERVICE_LINK: NavItem = { label: "LinkService", href: "/dashboard/linkservice", icon: "L" };
const APPOINTMENTS_LINK: NavItem = { label: "Citas", href: "/dashboard/appointments", icon: "C" };
const INVOICING_LINK: NavItem = { label: "Facturacion", href: "/dashboard/invoicing", icon: "F" };

function buildSummaryLabel(): string {
  return "Resumen";
}

export function getDashboardNavItems({
  showAdmin = false,
  enableLinkService = false,
  enableInvoice = false,
  enableInvoicing = false,
  activeModuleLabels = []
}: {
  showAdmin?: boolean;
  enableLinkService?: boolean;
  enableInvoice?: boolean;
  enableInvoicing?: boolean;
  activeModuleLabels?: string[];
}): NavItem[] {
  const summary: NavItem = {
    label: buildSummaryLabel(),
    href: "/dashboard",
    icon: "R"
  };

  const base: NavItem[] = [
    summary,
    { label: "Modulos", href: "/dashboard/modules", icon: "M" },
    { label: "Configuracion", href: "/dashboard/settings", icon: "S" }
  ];

  return [
    ...base,
    ...(enableLinkService ? [LINK_SERVICE_LINK] : []),
    ...(enableInvoice ? [APPOINTMENTS_LINK] : []),
    ...(enableInvoicing ? [INVOICING_LINK] : []),
    ...(showAdmin ? ADMIN_LINKS : [])
  ];
}
