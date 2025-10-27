import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";

const BUCKET_NAME = "linkservice-assets";

async function ensureBucket() {
  const service = getServiceSupabase();
  const { data: buckets } = await service.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);
  if (!exists) {
    await service.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
    });
  }
  return service;
}

function buildPath(params: { tenantId: string; scope: string; profileId?: string; extension: string }) {
  const parts = [params.tenantId, params.scope];
  if (params.profileId) parts.push(params.profileId);
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  parts.push(`${unique}.${params.extension}`);
  return parts.join("/");
}

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
      return NextResponse.json({ error: "No tienes permisos para subir archivos" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const scope = (formData.get("scope") as string) ?? "profile";
    const profileId = formData.get("profileId") as string | null;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Archivo invalido" }, { status: 400 });
    }

    const allowedScopes = new Set(["profile-avatar", "link-thumbnail", "link-carousel"]);
    const normalizedScope = allowedScopes.has(scope) ? scope : "profile-avatar";

    const extension = (file.name?.split(".").pop() ?? "png").toLowerCase();
    const service = await ensureBucket();
    const arrayBuffer = await file.arrayBuffer();
    const path = buildPath({
      tenantId: currentUser.tenantId,
      scope: normalizedScope,
      profileId: profileId ?? undefined,
      extension
    });

    const { error: uploadError } = await service.storage.from(BUCKET_NAME).upload(path, arrayBuffer, {
      upsert: true,
      contentType: file.type || undefined
    });

    if (uploadError) {
      console.error("[linkservice] upload error", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrl } = service.storage.from(BUCKET_NAME).getPublicUrl(path);

    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch (error) {
    console.error("[linkservice] upload route", error);
    return NextResponse.json({ error: "No pudimos subir el archivo" }, { status: 500 });
  }
}
