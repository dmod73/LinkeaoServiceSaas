import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isModuleEnabledForTenant } from "@/lib/features/moduleAccess";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant") ?? req.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ settings: null });

    const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!enabled) return NextResponse.json({ settings: null });

    const service = getServiceSupabase();
    const { data, error } = await service
      .from("appointments_settings")
      .select("slot_interval_minutes, business_hours, breaks")
      .eq("tenant_id", tenantId)
      .single();
    if (error) {
      return NextResponse.json({ settings: null });
    }
    return NextResponse.json({ settings: data });
  } catch (err) {
    return NextResponse.json({ settings: null });
  }
}
