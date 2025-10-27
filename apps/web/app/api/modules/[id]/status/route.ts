import { NextResponse } from "next/server";
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

export const revalidate = 0;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    const supabase = await getServerSupabase();

    let tenantId = currentUser?.tenantId ?? null;

    if (!tenantId && currentUser) {
      const { data: fallbackMembership } = await supabase
        .from("memberships")
        .select("tenant_id, role")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(25);

      const bestMembership = pickBestMembership(fallbackMembership as MembershipRow[] | null);

      tenantId = bestMembership?.tenant_id ?? null;
    }

    if (!tenantId) {
      return NextResponse.json({ enabled: false });
    }

    const { data, error } = await supabase
      .from("tenant_modules")
      .select("enabled")
      .eq("tenant_id", tenantId)
      .eq("module_id", params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({ enabled: Boolean(data?.enabled) });
  } catch (error) {
    console.error("[modules] status", error);
    return NextResponse.json({ enabled: false });
  }
}
