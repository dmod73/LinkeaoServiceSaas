import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { syncTenantSlugToVercel } from "@/lib/integrations/vercel";

const SLUG_REGEX = /^[a-z0-9-]{3,}$/;

export async function POST(req: Request) {
  try {
    const { currentTenantId, desiredSlug } = (await req.json()) as {
      currentTenantId?: string;
      desiredSlug?: string;
    };

    if (!currentTenantId || !desiredSlug) {
      return NextResponse.json({ error: "Parametros incompletos" }, { status: 400 });
    }

    if (!SLUG_REGEX.test(desiredSlug)) {
      return NextResponse.json({ error: "El slug debe tener al menos 3 caracteres (a-z, 0-9, -)." }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const service = getServiceSupabase();

    const membership = await service
      .from("memberships")
      .select("role")
      .eq("tenant_id", currentTenantId)
      .eq("user_id", user.id)
      .maybeSingle();

    const role = membership.data?.role;
    if (membership.error || !role || (role !== "admin" && role !== "system_admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const normalizedSlug = desiredSlug.toLowerCase();

    if (normalizedSlug === currentTenantId) {
      return NextResponse.json({ slug: normalizedSlug, unchanged: true });
    }

    const slugCheck = await service.from("tenants").select("id").eq("id", normalizedSlug).maybeSingle();
    if (slugCheck.data) {
      return NextResponse.json({ error: "Ese slug ya esta en uso." }, { status: 409 });
    }

    const tenantRes = await service.from("tenants").select("name").eq("id", currentTenantId).maybeSingle();
    if (tenantRes.error || !tenantRes.data) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    const insertRes = await service.from("tenants").insert({ id: normalizedSlug, name: tenantRes.data.name }).select();
    if (insertRes.error) {
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
    }

    const updateDomains = await service
      .from("tenant_domains")
      .update({ tenant_id: normalizedSlug })
      .eq("tenant_id", currentTenantId);
    if (updateDomains.error) {
      return NextResponse.json({ error: updateDomains.error.message }, { status: 500 });
    }

    const updateMemberships = await service
      .from("memberships")
      .update({ tenant_id: normalizedSlug })
      .eq("tenant_id", currentTenantId);
    if (updateMemberships.error) {
      return NextResponse.json({ error: updateMemberships.error.message }, { status: 500 });
    }

    const deleteOld = await service.from("tenants").delete().eq("id", currentTenantId);
    if (deleteOld.error) {
      return NextResponse.json({ error: deleteOld.error.message }, { status: 500 });
    }

    await syncTenantSlugToVercel(currentTenantId, normalizedSlug);

    return NextResponse.json({ slug: normalizedSlug });
  } catch (error) {
    console.error("[tenant/slug]", error);
    return NextResponse.json({ error: "No pudimos actualizar el slug" }, { status: 500 });
  }
}


