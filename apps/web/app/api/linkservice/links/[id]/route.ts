import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";
const LINK_KINDS = ["url", "whatsapp", "facebook", "instagram", "carousel", "phone", "map"] as const;
type LinkKind = (typeof LINK_KINDS)[number];

type UpdateBody = {
  label?: string;
  url?: string;
  description?: string | null;
  icon?: string | null;
  thumbnailUrl?: string | null;
  isActive?: boolean;
  highlight?: boolean;
  position?: number;
  kind?: string;
  payload?: unknown;
};

async function ensureAccess(linkId: string, userId: string, tenantId: string, requireAdmin = true) {
  const service = getServiceSupabase();
  const { data: linkRow, error: linkError } = await service
    .from("link_service_links")
    .select("profile_id")
    .eq("id", linkId)
    .maybeSingle();

  if (linkError) {
    throw new Error(linkError.message);
  }
  if (!linkRow) {
    const err = new Error("Link no encontrado");
    (err as any).status = 404;
    throw err;
  }

  const { data: profileRow, error: profileError } = await service
    .from("link_service_profiles")
    .select("tenant_id")
    .eq("id", linkRow.profile_id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profileRow || profileRow.tenant_id !== tenantId) {
    const err = new Error("Link no encontrado");
    (err as any).status = 404;
    throw err;
  }

  if (!requireAdmin) {
    return linkRow.profile_id as string;
  }

  const { data: membership, error: membershipError } = await service
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }
  if (!membership || (membership.role !== "admin" && membership.role !== "system_admin")) {
    const err = new Error("No tienes permisos");
    (err as any).status = 403;
    throw err;
  }

  return linkRow.profile_id as string;
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteParams) {
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
      return NextResponse.json({ error: "No tienes permisos para editar links" }, { status: 403 });
    }

    const body = (await req.json()) as UpdateBody;
    const service = getServiceSupabase();
    const profileId = await ensureAccess(id, currentUser.id, currentUser.tenantId);

    const existing = await service
      .from("link_service_links")
      .select("url, kind, payload")
      .eq("id", id)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }
    if (!existing.data) {
      return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
    }

    const currentKind = (existing.data.kind as LinkKind | undefined) ?? "url";
    const nextKind =
      body.kind !== undefined && LINK_KINDS.includes((body.kind ?? "") as LinkKind)
        ? (body.kind as LinkKind)
        : currentKind;

    const existingPayload = Array.isArray(existing.data.payload)
      ? (existing.data.payload as string[]).map((value) => (typeof value === "string" ? value : ""))
      : [];

    let nextPayload =
      body.payload !== undefined
        ? Array.isArray(body.payload)
          ? (body.payload as unknown[])
              .map((value) => (typeof value === "string" ? value.trim() : ""))
              .filter((value) => !!value)
          : []
        : existingPayload;

    let nextUrl = existing.data.url?.trim() ?? "";
    if (body.url !== undefined) {
      nextUrl = body.url?.trim() ?? "";
    }

    if (nextKind === "carousel") {
      if (!nextPayload.length && nextUrl) {
        nextPayload = [nextUrl];
      }
      if (!nextPayload.length) {
        return NextResponse.json({ error: "El carrusel requiere al menos una imagen" }, { status: 400 });
      }
      nextUrl = nextPayload[0];
    } else if (nextKind === "map") {
      if (body.url !== undefined && !nextUrl) {
        return NextResponse.json({ error: "La URL del mapa es requerida" }, { status: 400 });
      }
      if (!nextUrl) {
        return NextResponse.json({ error: "La URL del mapa es requerida" }, { status: 400 });
      }
      nextPayload = [];
    } else {
      nextPayload = [];
      if (body.url !== undefined && !nextUrl) {
        return NextResponse.json({ error: "La URL es requerida para este tipo de enlace" }, { status: 400 });
      }
      if (!nextUrl) {
        return NextResponse.json({ error: "La URL es requerida para este tipo de enlace" }, { status: 400 });
      }
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.label !== undefined) payload.label = body.label.trim();
    if (body.description !== undefined) payload.description = body.description ?? null;
    if (body.icon !== undefined) payload.icon = body.icon ?? null;
    if (body.thumbnailUrl !== undefined) payload.thumbnail_url = body.thumbnailUrl ?? null;
    if (body.isActive !== undefined) payload.is_active = body.isActive;
    if (body.highlight !== undefined) payload.highlight = body.highlight;
    if (body.kind !== undefined) payload.kind = nextKind;
    if (
      body.payload !== undefined ||
      nextKind === "carousel" ||
      currentKind === "carousel" ||
      nextKind === "map" ||
      currentKind === "map"
    ) {
      payload.payload = nextPayload;
    }
    if (body.url !== undefined || nextKind === "carousel" || nextKind === "map") payload.url = nextUrl;
    if (typeof body.position === "number" && Number.isFinite(body.position)) {
      payload.position = Math.max(0, Math.floor(body.position));
    }

    const update = await service
      .from("link_service_links")
      .update(payload)
      .eq("id", id)
      .select(
        "id, profile_id, label, url, description, icon, kind, payload, thumbnail_url, position, is_active, highlight, created_at, updated_at"
      )
      .single();

    if (update.error) {
      return NextResponse.json({ error: update.error.message }, { status: 500 });
    }

    return NextResponse.json({ link: update.data, profileId });
  } catch (error) {
    const status = (error as any).status ?? 500;
    const message =
      status === 404
        ? "Link no encontrado"
        : status === 403
        ? "No tienes permisos para editar este link"
        : "No pudimos actualizar el link";
    if (status === 500) console.error("[linkservice] update link", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: Request, context: RouteParams) {
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
      return NextResponse.json({ error: "No tienes permisos para eliminar links" }, { status: 403 });
    }

    const profileId = await ensureAccess(id, currentUser.id, currentUser.tenantId);
    const service = getServiceSupabase();
    const remove = await service.from("link_service_links").delete().eq("id", id);
    if (remove.error) {
      return NextResponse.json({ error: remove.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, profileId });
  } catch (error) {
    const status = (error as any).status ?? 500;
    const message =
      status === 404
        ? "Link no encontrado"
        : status === 403
        ? "No tienes permisos para eliminar este link"
        : "No pudimos eliminar el link";
    if (status === 500) console.error("[linkservice] delete link", error);
    return NextResponse.json({ error: message }, { status });
  }
}
