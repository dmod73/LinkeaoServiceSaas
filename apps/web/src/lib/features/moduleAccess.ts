import type { Role } from "@core/shared";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServerSupabase } from "@/lib/supabase/server";

type MembershipRow = { tenant_id: string; role: Role };

const ROLE_RANK: Record<Role, number> = {
  system_admin: 3,
  admin: 2,
  member: 1
};

function pickBestMembership(rows: MembershipRow[] | null | undefined) {
  if (!rows?.length) return undefined;
  return [...rows].sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role])[0];
}

type TenantContext = {
  tenantId: string | null;
  role: Role;
};

async function resolveTenantContext(): Promise<TenantContext | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const supabase = await getServerSupabase();

  let tenantId = currentUser.tenantId ?? null;
  let role = currentUser.role;

  if (!tenantId || role === "member") {
    const { data: fallbackMembership } = await supabase
      .from("memberships")
      .select("tenant_id, role")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    const best = pickBestMembership(fallbackMembership as MembershipRow[] | null);

    if (!tenantId) {
      tenantId = best?.tenant_id ?? null;
    }

    if (best?.role) {
      role = best.role;
    }
  }

  return { tenantId, role };
}

export type TenantModule = {
  id: string;
  name: string;
  description: string;
  isFree: boolean;
  enabled: boolean;
};

export async function listTenantModules(): Promise<TenantModule[]> {
  const context = await resolveTenantContext();
  if (!context?.tenantId) return [];

  const supabase = await getServerSupabase();

  const [{ data: moduleRows, error: modulesError }, { data: tenantModules, error: tenantError }] = await Promise.all([
    supabase.from("modules").select("id, name, description, is_free").order("name", { ascending: true }),
    supabase.from("tenant_modules").select("module_id, enabled").eq("tenant_id", context.tenantId)
  ]);

  if (modulesError) {
    console.error("[moduleAccess] modules query error", modulesError);
    return [];
  }
  if (tenantError) {
    console.error("[moduleAccess] tenant modules query error", tenantError);
  }

  const enabledMap = new Map((tenantModules ?? []).map((row) => [row.module_id, Boolean(row.enabled)]));

  return (moduleRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    isFree: Boolean(row.is_free),
    enabled: enabledMap.get(row.id) ?? false
  }));
}

export async function isModuleEnabled(moduleId: string): Promise<boolean> {
  const modules = await listTenantModules();
  return modules.some((module) => module.id === moduleId && module.enabled);
}
