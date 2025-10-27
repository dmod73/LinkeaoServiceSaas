import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";

type Body = {
  userId?: string;
  tenantId?: string;
  role?: string;
};

const ALLOWED_ROLES = new Set(["admin", "member"]);

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isPlatformAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const userId = body.userId?.trim();
    const tenantId = body.tenantId?.trim();
    const role = body.role?.trim();

    if (!userId || !tenantId || !role) {
      return NextResponse.json({ error: "Parametros incompletos" }, { status: 400 });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Rol no permitido" }, { status: 400 });
    }

    const service = getServiceSupabase();
    const { error } = await service
      .from("memberships")
      .update({ role })
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/users/update-role]", error);
    return NextResponse.json({ error: "No pudimos actualizar el rol" }, { status: 500 });
  }
}

