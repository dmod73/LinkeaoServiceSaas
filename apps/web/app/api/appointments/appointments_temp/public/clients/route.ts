import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isModuleEnabledForTenant } from "@/lib/features/moduleAccess";

type Body = {
  fullName: string;
  email?: string | null;
  phone?: string | null;
};

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant") ?? req.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });

  const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
  if (!enabled) return NextResponse.json({ error: "Módulo Appointments deshabilitado" }, { status: 412 });

    const body = (await req.json()) as Body;
    if (!body?.fullName || !body.fullName.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const service = getServiceSupabase();
    const email = body.email?.trim()?.toLowerCase() ?? null;
    const phone = body.phone?.trim() ?? null;

    // Try by email then by phone
    if (email) {
      const { data: byEmail } = await service
        .from("appointments_clients")
        .select("id, full_name, email, phone")
        .eq("tenant_id", tenantId)
        .eq("email", email)
        .maybeSingle();
      if (byEmail) return NextResponse.json({ client: byEmail });
    }

    if (phone) {
      const { data: byPhone } = await service
        .from("appointments_clients")
        .select("id, full_name, email, phone")
        .eq("tenant_id", tenantId)
        .eq("phone", phone)
        .maybeSingle();
      if (byPhone) return NextResponse.json({ client: byPhone });
    }

    const { data: newClient, error } = await service
      .from("appointments_clients")
      .insert({ tenant_id: tenantId, full_name: body.fullName.trim(), email, phone })
      .select("id, full_name, email, phone")
      .single();

    if (error || !newClient) {
      console.error("[invoice] public client create", error);
      return NextResponse.json({ error: "No pudimos crear el cliente" }, { status: 500 });
    }

    return NextResponse.json({ client: newClient });
  } catch (err) {
    console.error("[invoice] public client POST", err);
    return NextResponse.json({ error: "Error creando cliente" }, { status: 500 });
  }
}
