import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isModuleEnabledForTenant } from "@/lib/features/moduleAccess";
import { ensureAvailabilityExists } from "@/lib/features/appointments/defaultAvailability";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant") ?? req.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ availability: [], timeOff: [] });

    const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!enabled) return NextResponse.json({ availability: [], timeOff: [] });

    const service = getServiceSupabase();

    // Check if tenant has settings with business_hours (new format)
    const { data: settings } = await service
      .from("appointments_settings")
      .select("business_hours, breaks")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    let availability: any[] = [];

    if (settings?.business_hours && Array.isArray(settings.business_hours)) {
      // Convert business_hours format to availability format
      // Dashboard uses: 1=Monday, 2=Tuesday, ..., 6=Saturday, 0=Sunday
      // We need: 0=Monday, 1=Tuesday, ..., 5=Saturday, 6=Sunday
      availability = settings.business_hours
        .filter((day: any) => day.start && day.end && day.start !== '' && day.end !== '')
        .map((day: any) => {
          const dashboardWeekday = Number(day.weekday);
          // Convert: dashboard 1-6 -> 0-5, dashboard 0 -> 6
          const normalizedWeekday = dashboardWeekday === 0 ? 6 : dashboardWeekday - 1;
          return {
            id: `${tenantId}-${normalizedWeekday}`,
            weekday: normalizedWeekday,
            start: day.start,
            end: day.end
          };
        });
    } else {
      // Fallback to appointments_availability table
      await ensureAvailabilityExists(tenantId);

      const availabilityRes = await service
        .from("appointments_availability")
        .select("id, weekday, start_time, end_time")
        .eq("tenant_id", tenantId)
        .order("weekday", { ascending: true });

      if (availabilityRes.error) {
        console.error("[invoice] public availability fetch", availabilityRes.error);
        return NextResponse.json({ availability: [], timeOff: [] });
      }

      availability = (availabilityRes.data ?? []).map((row) => ({
        id: row.id,
        weekday: row.weekday,
        start: row.start_time,
        end: row.end_time
      }));
    }

    const timeOffRes = await service
      .from("appointments_time_off")
      .select("id, starts_at, ends_at, reason")
      .eq("tenant_id", tenantId)
      .order("starts_at", { ascending: true });

    if (timeOffRes.error) {
      console.error("[invoice] public time off fetch", timeOffRes.error);
    }

    return NextResponse.json({
      availability,
      breaks: Array.isArray(settings?.breaks) ? settings.breaks.map((b: any) => {
        const dashboardWeekday = Number(b.weekday);
        const normalizedWeekday = dashboardWeekday === 0 ? 6 : dashboardWeekday - 1;
        return {
          weekday: normalizedWeekday,
          start: b.start,
          end: b.end
        };
      }) : [],
      timeOff: (timeOffRes.data ?? []).map((row) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        reason: row.reason
      }))
    });
  } catch (err) {
    console.error("[invoice] public availability GET", err);
    return NextResponse.json({ availability: [], timeOff: [] });
  }
}
