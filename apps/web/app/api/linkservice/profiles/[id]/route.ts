import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";

type UpdateBody = {
  title?: string;
  subtitle?: string;
  avatarUrl?: string | null;
  social?: Record<string, string>;
  theme?: Record<string, unknown>;
  handle?: string;
};

function sanitizeHandle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!currentUser.tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    if (currentUser.role === "member") {
      return NextResponse.json({ error: "No tienes permisos para editar perfiles" }, { status: 403 });
    }

    const service = getServiceSupabase();

    const { data: profile, error: fetchError } = await service
      .from("link_service_profiles")
      .select("tenant_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!profile || profile.tenant_id !== currentUser.tenantId) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    const body = (await _.json()) as UpdateBody;
    const payload: Record<string, unknown> = {};

    if (body.title !== undefined) payload.title = body.title.trim();
    if (body.subtitle !== undefined) payload.subtitle = body.subtitle?.trim() ?? null;
    if (body.avatarUrl !== undefined) payload.avatar_url = body.avatarUrl?.trim() ?? null;
    if (body.social !== undefined) payload.social = body.social;
    if (body.theme !== undefined) payload.theme = body.theme;
    if (body.handle !== undefined) {
      const normalized = sanitizeHandle(body.handle);
      if (!normalized) {
        return NextResponse.json({ error: "Handle invalido" }, { status: 400 });
      }
      payload.handle = normalized;
    }

    payload.updated_at = new Date().toISOString();

    const update = await service
      .from("link_service_profiles")
      .update(payload)
      .eq("id", id)
      .select(
        "id, tenant_id, handle, title, subtitle, avatar_url, social, theme, created_at, updated_at, link_service_links(id, label, url, description, icon, position, is_active, highlight, created_at, updated_at)"
      )
      .single();

    if (update.error) {
      if (update.error.code === "23505") {
        return NextResponse.json({ error: "El handle ya esta en uso" }, { status: 409 });
      }
      return NextResponse.json({ error: update.error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: update.data });
  } catch (error) {
    console.error("[linkservice] update profile", error);
    return NextResponse.json({ error: "No pudimos actualizar el perfil" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const canDelete = currentUser.role === "system_admin" || currentUser.role === "admin";
    if (!canDelete) {
      return NextResponse.json({ error: "No tienes permisos para eliminar perfiles" }, { status: 403 });
    }
    if (!currentUser.tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    const service = getServiceSupabase();
    const { data: profile, error } = await service
      .from("link_service_profiles")
      .select("tenant_id")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!profile || profile.tenant_id !== currentUser.tenantId) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    const remove = await service.from("link_service_profiles").delete().eq("id", id);
    if (remove.error) {
      return NextResponse.json({ error: remove.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[linkservice] delete profile", error);
    return NextResponse.json({ error: "No pudimos eliminar el perfil" }, { status: 500 });
  }
}
