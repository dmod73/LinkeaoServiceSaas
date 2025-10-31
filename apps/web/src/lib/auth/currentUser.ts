import type { Role } from "@core/shared";
import { getServerSupabase } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/service";
import { ensurePrimaryMembership } from "@/lib/auth/platformAdmin";

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  fullName?: string;
  avatarUrl?: string;
  tenantId?: string;
  isPlatformAdmin: boolean;
};

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

type MembershipRow = {
  tenant_id: string;
  role: Role;
};

const ROLE_PRIORITY: Record<Role, number> = {
  system_admin: 3,
  admin: 2,
  member: 1
};

function pickHighestPrivilege(rows: MembershipRow[] | null | undefined) {
  if (!rows?.length) return undefined;
  return [...rows].sort((a, b) => ROLE_PRIORITY[b.role] - ROLE_PRIORITY[a.role])[0];
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Simple in-memory short TTL cache to avoid hitting Supabase auth rate limits
  // when many server-side components call getCurrentUser repeatedly during dev/hot-reload.
  // Keyed by the raw Cookie header (or 'no-cookie'). TTL: 5 seconds.
  const cookieHeader = (await headers()).get("cookie") ?? "no-cookie";
  try {
    const cacheKey = `currentUser:${cookieHeader}`;
    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalAny: any = globalThis as any;
    if (!globalAny.__currentUserCache) globalAny.__currentUserCache = new Map<string, { ts: number; value: CurrentUser | null }>();
    const cache: Map<string, { ts: number; value: CurrentUser | null }> = globalAny.__currentUserCache;
    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < 5000) {
      return cached.value;
    }

    const supabase = await getServerSupabase();
    const result = await (async () => {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) return null;

      const service = getServiceSupabase();

      const [profileRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).maybeSingle()
      ]);

      const profileData = profileRes.data as ProfileRow | null;

      const ensured = await ensurePrimaryMembership({
        service,
        userId: user.id,
        email: user.email ?? null,
        fullName: profileData?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null
      });

      const { data: membershipRows, error: membershipError } = await service
        .from("memberships")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const effectiveMembership =
        pickHighestPrivilege(
          !membershipError && Array.isArray(membershipRows) ? (membershipRows as MembershipRow[]) : null
        ) ??
        (ensured.tenantId ? { tenant_id: ensured.tenantId, role: ensured.role } : undefined);

      const { data: platformAdminRow, error: platformError } = await service
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const isPlatformAdmin = !platformError && Boolean(platformAdminRow);
      const resolvedRole: Role = isPlatformAdmin ? "system_admin" : effectiveMembership?.role ?? "member";

      return {
        id: user.id,
        email: user.email ?? "",
        role: resolvedRole,
        isPlatformAdmin,
        fullName: profileData?.full_name ?? (user.user_metadata?.full_name as string | undefined),
        avatarUrl: profileData?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined),
        tenantId: effectiveMembership?.tenant_id ?? undefined
      } as CurrentUser;
    })();

    cache.set(cacheKey, { ts: now, value: result });
    return result;
  } catch (err) {
    // If the auth service returns rate-limit or other transient errors, avoid throwing and return null
    // to keep the app responsive during dev. The error is still logged for diagnostics.
    // eslint-disable-next-line no-console
    console.warn("getCurrentUser: auth lookup failed (falling back to null)", err);
    return null;
  }
}
