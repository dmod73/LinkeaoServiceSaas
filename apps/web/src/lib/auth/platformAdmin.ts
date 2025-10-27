import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@core/shared";
import { generateTenantSlug } from "@/lib/tenants/generateSlug";

const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  return PLATFORM_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

type EnsureMembershipParams = {
  service: SupabaseClient;
  userId: string;
  email: string | null;
  fullName?: string | null;
};

type MembershipRow = {
  tenant_id: string;
  role: Role;
};

const ROLE_RANK: Record<Role, number> = {
  system_admin: 3,
  admin: 2,
  member: 1
};

function pickBestMembership(rows: MembershipRow[] | null | undefined) {
  if (!rows?.length) return undefined;
  return [...rows].sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role])[0];
}

export async function ensurePrimaryMembership({
  service,
  userId,
  email,
  fullName
}: EnsureMembershipParams): Promise<{ tenantId: string | null; role: Role }> {
  const targetRole: Role = isPlatformAdminEmail(email) ? "system_admin" : "admin";

  const membership = await service
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (membership.error) {
    throw membership.error;
  }

  const existing = pickBestMembership(membership.data as MembershipRow[] | null);

  let tenantId = existing?.tenant_id ?? null;

  if (!tenantId) {
    tenantId = await generateTenantSlug(service, email ?? null, userId);

    const tenantResult = await service.from("tenants").upsert(
      {
        id: tenantId,
        name: fullName ?? tenantId
      },
      { onConflict: "id" }
    );

    if (tenantResult.error) {
      throw tenantResult.error;
    }

    const insertMembership = await service.from("memberships").upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role: targetRole
      },
      { onConflict: "tenant_id,user_id" }
    );

    if (insertMembership.error) {
      throw insertMembership.error;
    }
  } else if (existing?.role !== targetRole) {
    const updateRole = await service
      .from("memberships")
      .update({ role: targetRole })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId);

    if (updateRole.error) {
      throw updateRole.error;
    }
  }

  const verify = await service
    .from("memberships")
    .select("tenant_id, role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (verify.error) {
    throw verify.error;
  }

  if (!verify.data) {
    const fallbackInsert = await service.from("memberships").upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role: targetRole
      },
      { onConflict: "tenant_id,user_id" }
    );
    if (fallbackInsert.error) {
      throw fallbackInsert.error;
    }
  } else if (verify.data.role !== targetRole) {
    const enforceRole = await service
      .from("memberships")
      .update({ role: targetRole })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId);
    if (enforceRole.error) {
      throw enforceRole.error;
    }
  }

  if (targetRole === "system_admin") {
    const platformInsert = await service
      .from("platform_admins")
      .upsert({ user_id: userId }, { onConflict: "user_id" });

    if (platformInsert.error) {
      throw platformInsert.error;
    }
  }

  return { tenantId, role: targetRole };
}
