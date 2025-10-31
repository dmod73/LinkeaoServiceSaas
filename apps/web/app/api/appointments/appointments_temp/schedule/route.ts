import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getTenantContext, isModuleEnabledForTenant } from "@/lib/features/moduleAccess";
import { getServiceSupabase } from "@/lib/supabase/service";

const BLOCK_STATUSES = ["rejected", "cancelled"] as const;

type ScheduleRow = {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
};

export async function GET(req: Request) {
  try {
    const [currentUser, context] = await Promise.all([getCurrentUser(), getTenantContext()]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const tenantId = context?.tenantId ?? req.headers.get("x-tenant-id") ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!enabled) {
      return NextResponse.json({ appointments: [] });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    if (!dateParam) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }

    const date = new Date(dateParam);
    if (Number.isNaN(date.valueOf())) {
      return NextResponse.json({ error: "Fecha invalida" }, { status: 400 });
    }

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
      console.error("[invoice] schedule fetch", error);
      return NextResponse.json({ error: "No pudimos consultar la agenda" }, { status: 500 });
    }

    const rows = (data ?? []) as ScheduleRow[];

    return NextResponse.json({
      appointments: rows.map((row) => ({
        id: row.id,
        status: row.status,
        startsAt: row.scheduled_start,
        endsAt: row.scheduled_end
      }))
    });
  } catch (error) {
    console.error("[invoice] schedule GET", error);
    return NextResponse.json({ error: "No pudimos obtener la agenda" }, { status: 500 });
  }
}
