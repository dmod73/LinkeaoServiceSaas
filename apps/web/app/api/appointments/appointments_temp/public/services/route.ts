import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isModuleEnabledForTenant } from "@/lib/features/moduleAccess";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant") ?? req.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ services: [] });

    const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!enabled) return NextResponse.json({ services: [] });

    const service = getServiceSupabase();
    const { data, error } = await service
      .from("appointments_services")
      .select("id, name, description, duration_minutes, price, currency, is_active")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("[invoice] public services fetch", error);
      return NextResponse.json({ services: [] });
    }

    return NextResponse.json({ services: data ?? [] });
  } catch (err) {
    console.error("[invoice] public services GET", err);
    return NextResponse.json({ services: [] });
  }
}
