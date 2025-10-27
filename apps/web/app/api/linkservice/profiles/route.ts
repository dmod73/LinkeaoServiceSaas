import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";

type CreateProfileBody = {
  handle?: string;
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  social?: Record<string, string>;
  theme?: Record<string, unknown>;
};

function sanitizeHandle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const isSystemAdmin = currentUser.role === "system_admin";
    const isAdmin = currentUser.role === "admin";

    if (!isSystemAdmin && !isAdmin) {
      return NextResponse.json({ error: "Solo administradores pueden crear perfiles" }, { status: 403 });
    }

    if (!currentUser.tenantId) {
      return NextResponse.json({ error: "Tenant no definido para el usuario" }, { status: 400 });
    }

    const body = (await req.json()) as CreateProfileBody;
    const handle = body.handle ? sanitizeHandle(body.handle) : "";
    const title = body.title?.trim();

    if (!handle || !title) {
      return NextResponse.json({ error: "Handle y titulo son requeridos" }, { status: 400 });
    }

    const service = getServiceSupabase();

    if (isAdmin) {
      const { count, error: countError } = await service
        .from("link_service_profiles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", currentUser.tenantId);

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      if ((count ?? 0) >= 1) {
        return NextResponse.json(
          { error: "El plan actual permite un unico perfil. Contacta al system admin para ampliar la cuota." },
          { status: 403 }
        );
      }
    }

    const payload = {
      tenant_id: currentUser.tenantId,
      handle,
      title,
      subtitle: body.subtitle?.trim() ?? null,
      avatar_url: body.avatarUrl?.trim() ?? null,
      social: body.social ?? {},
      theme: body.theme ?? undefined,
      created_by: currentUser.id
    };

    const insert = await service
      .from("link_service_profiles")
      .insert(payload)
      .select(
        "id, tenant_id, handle, title, subtitle, avatar_url, social, theme, created_at, updated_at, link_service_links(id, label, url, description, icon, position, is_active, highlight, created_at, updated_at)"
      )
      .single();

    if (insert.error) {
      if (insert.error.code === "23505") {
        return NextResponse.json({ error: "Ese handle ya existe en el tenant" }, { status: 409 });
      }
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: insert.data });
  } catch (error) {
    console.error("[linkservice] create profile", error);
    return NextResponse.json({ error: "No pudimos crear el perfil" }, { status: 500 });
  }
}
