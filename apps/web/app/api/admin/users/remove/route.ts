import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";

type Body = {
  userId?: string;
};

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isPlatformAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const userId = body.userId?.trim();

    if (!userId) {
      return NextResponse.json({ error: "Parametros incompletos" }, { status: 400 });
    }

    if (userId === currentUser.id) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }

    const service = getServiceSupabase();

    const deleteAuth = await service.auth.admin.deleteUser(userId);
    if (deleteAuth.error) {
      return NextResponse.json({ error: deleteAuth.error.message }, { status: 500 });
    }

    await service.from("platform_admins").delete().eq("user_id", userId);
    await service.from("memberships").delete().eq("user_id", userId);
    await service.from("profiles").delete().eq("user_id", userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/users/remove]", error);
    return NextResponse.json({ error: "No pudimos eliminar al usuario" }, { status: 500 });
  }
}

