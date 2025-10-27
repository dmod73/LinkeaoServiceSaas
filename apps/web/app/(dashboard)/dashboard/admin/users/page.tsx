import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";
import { UserManagementClient, type UserSummary } from "./UserManagementClient";

export const revalidate = 0;

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  if (!currentUser.isPlatformAdmin) {
    redirect("/dashboard");
  }

  const service = getServiceSupabase();

  const users: UserSummary[] = [];
  let page = 1;
  const perPage = 200;
  let hasMore = true;

  while (hasMore) {
    const response = await service.auth.admin.listUsers({ page, perPage });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const batch = response.data?.users ?? [];

    batch.forEach((user) => {
      users.push({
        id: user.id,
        email: user.email ?? "",
        fullName: (user.user_metadata?.full_name as string | null) ?? null,
        avatarUrl: (user.user_metadata?.avatar_url as string | null) ?? null,
        createdAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        isPlatformAdmin: false,
        memberships: []
      });
    });

    hasMore = Boolean(response.data?.nextPage);
    page = response.data?.nextPage ?? 0;
  }

  const { data: membershipsData, error: membershipsError } = await service
    .from("memberships")
    .select("user_id, tenant_id, role");

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const { data: tenantsData, error: tenantsError } = await service.from("tenants").select("id, name");

  if (tenantsError) {
    throw new Error(tenantsError.message);
  }

  const { data: platformAdminsData, error: platformError } = await service
    .from("platform_admins")
    .select("user_id");

  if (platformError) {
    throw new Error(platformError.message);
  }

  const tenantNameById = new Map((tenantsData ?? []).map((tenant) => [tenant.id, tenant.name]));
  const membershipByUser = new Map<string, UserSummary["memberships"]>();

  for (const membership of membershipsData ?? []) {
    if (!membership.user_id) continue;
    const currentList = membershipByUser.get(membership.user_id) ?? [];
    currentList.push({
      tenantId: membership.tenant_id ?? "",
      tenantName: tenantNameById.get(membership.tenant_id ?? "") ?? membership.tenant_id ?? "",
      role: (membership.role as "system_admin" | "admin" | "member") ?? "member"
    });
    membershipByUser.set(membership.user_id, currentList);
  }

  const platformAdminIds = new Set((platformAdminsData ?? []).map((row) => row.user_id));

  const summaries = users
    .map<UserSummary>((user) => ({
      ...user,
      isPlatformAdmin: platformAdminIds.has(user.id),
      memberships: membershipByUser.get(user.id) ?? []
    }))
    .sort((a, b) => {
      const dateA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const dateB = b.createdAt ? Date.parse(b.createdAt) : 0;
      return dateB - dateA;
    });

  return (
    <div>
      <UserManagementClient currentUserId={currentUser.id} users={summaries} />
    </div>
  );
}
