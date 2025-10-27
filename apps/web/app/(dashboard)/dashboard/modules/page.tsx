import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Role } from "@core/shared";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { ModuleStoreClient } from "./ModuleStoreClient";

export const revalidate = 0;

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

export default async function ModulesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const supabase = await getServerSupabase();

  let tenantId = currentUser.tenantId ?? null;
  let effectiveRole = currentUser.role;

  if (!tenantId || effectiveRole === "member") {
    const { data: fallbackMembership } = await supabase
      .from("memberships")
      .select("tenant_id, role")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    const bestMembership = pickBestMembership(fallbackMembership as MembershipRow[] | null);

    if (!tenantId) {
      tenantId = bestMembership?.tenant_id ?? null;
    }

    if (bestMembership?.role) {
      effectiveRole = bestMembership.role as typeof effectiveRole;
    }
  }

  const [{ data: moduleRows }, enabledRowsResult] = await Promise.all([
    supabase
      .from("modules")
      .select("id, name, description, is_free")
      .order("name", { ascending: true }),
    tenantId
      ? supabase
          .from("tenant_modules")
          .select("module_id, enabled")
          .eq("tenant_id", tenantId)
      : Promise.resolve({ data: null })
  ]);

  const enabledRows = enabledRowsResult?.data ?? null;
  const enabledMap = new Map((enabledRows ?? []).map((row) => [row.module_id, row.enabled]));

  const modules = (moduleRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    isFree: row.is_free ?? false,
    enabled: enabledMap.get(row.id) ?? false,
    plan: row.is_free ? "Libre" : "Pro"
  }));

  const canManage = Boolean(tenantId) && effectiveRole !== "member";

  async function toggleModule(moduleId: string, enabled: boolean) {
    "use server";
    const supabaseServer = await getServerSupabase();
    const identities = await getCurrentUser();

    if (!identities) {
      throw new Error("No autenticado");
    }

    let targetTenant = identities?.tenantId ?? null;
    let targetRole = identities?.role;

    if (!targetTenant || targetRole === "member") {
      const { data: fallbackMembership } = await supabaseServer
        .from("memberships")
        .select("tenant_id, role")
        .eq("user_id", identities?.id ?? "")
        .order("created_at", { ascending: false });

      const bestMembership = pickBestMembership(fallbackMembership as MembershipRow[] | null);

      if (!targetTenant) {
        targetTenant = bestMembership?.tenant_id ?? null;
      }

      if (bestMembership?.role) {
        targetRole = bestMembership.role as typeof targetRole;
      }
    }

    if (!targetTenant || targetRole === "member") {
      throw new Error("No tienes permisos para activar modulos");
    }

    const payload = {
      tenant_id: targetTenant,
      module_id: moduleId,
      enabled,
      updated_at: new Date().toISOString(),
      created_by: identities.id
    };

    const { error } = await supabaseServer
      .from("tenant_modules")
      .upsert(payload, { onConflict: "tenant_id,module_id" });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/modules");
    revalidatePath("/dashboard/linkservice");
  }

  return (
    <ModuleStoreClient
      modules={modules}
      canManage={canManage}
      onToggle={toggleModule}
    />
  );
}
