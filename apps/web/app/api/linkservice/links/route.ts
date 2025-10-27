import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";

const LINK_KINDS = ["url", "whatsapp", "facebook", "instagram", "carousel", "phone", "map"] as const;
type LinkKind = (typeof LINK_KINDS)[number];

type CreateLinkBody = {
  profileId?: string;
  label?: string;
  url?: string;
  description?: string;
  icon?: string;
  thumbnailUrl?: string;
  kind?: string;
  payload?: unknown;
  isActive?: boolean;
  highlight?: boolean;
};

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!currentUser.tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }
    if (currentUser.role === "member") {
      return NextResponse.json({ error: "No tienes permisos para crear links" }, { status: 403 });
    }

    const body = (await req.json()) as CreateLinkBody;
    const profileId = body.profileId?.trim();
    const label = body.label?.trim();

    if (!profileId || !label) {
      return NextResponse.json({ error: "Perfil y etiqueta son requeridos" }, { status: 400 });
    }

    const service = getServiceSupabase();

    const { data: profile, error: profileError } = await service
      .from("link_service_profiles")
      .select("tenant_id")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!profile || profile.tenant_id !== currentUser.tenantId) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    const { data: maxPositionData, error: positionError } = await service
      .from("link_service_links")
      .select("position")
      .eq("profile_id", profileId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (positionError) {
      return NextResponse.json({ error: positionError.message }, { status: 500 });
    }

    const nextPosition = (maxPositionData?.position ?? -1) + 1;

    const kind = LINK_KINDS.includes((body.kind ?? "") as LinkKind) ? (body.kind as LinkKind) : "url";
    const sanitizePayload = (input: unknown): string[] =>
      Array.isArray(input)
        ? (input as unknown[])
            .map((value) => (typeof value === "string" ? value.trim() : ""))
            .filter((value) => !!value)
        : [];
    let payload = kind === "carousel" ? sanitizePayload(body.payload) : [];

    const rawUrl = body.url?.trim() ?? "";
    let url = rawUrl;

    if (kind === "carousel") {
      if (!payload.length && rawUrl) {
        payload = [rawUrl];
      }
      if (!payload.length) {
        return NextResponse.json({ error: "El carrusel requiere al menos una imagen" }, { status: 400 });
      }
      url = payload[0];
    } else if (!rawUrl) {
      return NextResponse.json({ error: "La URL es requerida para este tipo de enlace" }, { status: 400 });
    }

    const isActive = body.isActive ?? true;
    const highlight = body.highlight ?? false;

    const insert = await service
      .from("link_service_links")
      .insert({
        profile_id: profileId,
        label,
        url,
        description: body.description?.trim() ?? null,
        icon: body.icon?.trim() ?? null,
        thumbnail_url: body.thumbnailUrl?.trim() ?? null,
        kind,
        payload,
        is_active: isActive,
        highlight,
        position: nextPosition
      })
      .select(
        "id, profile_id, label, url, description, icon, kind, payload, thumbnail_url, position, is_active, highlight, created_at, updated_at"
      )
      .single();

    if (insert.error) {
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ link: insert.data });
  } catch (error) {
    console.error("[linkservice] create link", error);
    return NextResponse.json({ error: "No pudimos crear el link" }, { status: 500 });
  }
}
