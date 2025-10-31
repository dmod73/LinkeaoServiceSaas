import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isModuleEnabledForTenant } from "@/lib/features/moduleAccess";

const BLOCK_STATUSES = ["rejected", "cancelled"] as const;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant") ?? req.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ appointments: [] });

    const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!enabled) return NextResponse.json({ appointments: [] });

    const dateParam = url.searchParams.get("date");
    if (!dateParam) return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });

    const date = new Date(dateParam);
    if (Number.isNaN(date.valueOf())) return NextResponse.json({ error: "Fecha invalida" }, { status: 400 });

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const service = getServiceSupabase();
    const { data, error } = await service
      .from("appointments_appointments")
      .select("id, status, scheduled_start, scheduled_end")
      .eq("tenant_id", tenantId)
      .gte("scheduled_start", dayStart.toISOString())
      .lte("scheduled_end", dayEnd.toISOString())
      .not("status", "in", `(${BLOCK_STATUSES.join(",")})`);

    if (error) {
      console.error("[invoice] public schedule fetch", error);
      return NextResponse.json({ appointments: [] });
    }

    const rows = (data ?? []) as any[];
    return NextResponse.json({
      appointments: rows.map((row) => ({ id: row.id, status: row.status, startsAt: row.scheduled_start, endsAt: row.scheduled_end }))
    });
  } catch (err) {
    console.error("[invoice] public schedule GET", err);
    return NextResponse.json({ appointments: [] });
  }
}
