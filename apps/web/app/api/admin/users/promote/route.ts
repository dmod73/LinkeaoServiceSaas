import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";

type Body = {
  userId?: string;
  promote?: boolean;
};

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isPlatformAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const userId = body.userId?.trim();
    const promote = Boolean(body.promote);

    if (!userId) {
      return NextResponse.json({ error: "Parametros incompletos" }, { status: 400 });
    }

    if (userId === currentUser.id) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol de plataforma" }, { status: 400 });
    }

    const service = getServiceSupabase();

    if (promote) {
      const { error } = await service.from("platform_admins").upsert({ user_id: userId }, { onConflict: "user_id" });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await service.from("platform_admins").delete().eq("user_id", userId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/users/promote]", error);
    return NextResponse.json({ error: "No pudimos actualizar el rol de plataforma" }, { status: 500 });
  }
}

