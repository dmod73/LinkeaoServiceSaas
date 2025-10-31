/**
 * @file Public availability route handler for appointments
 * Returns business hours, breaks, and time off for a tenant
 */

import { getServiceSupabase } from "@/lib/supabase/service";
import { ensureAvailabilityExists } from "@/lib/features/appointments/defaultAvailability";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// GET handler - get public availability
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get("tenant");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
  }

  const service = getServiceSupabase();

  // Ensure default availability exists for this tenant
  await ensureAvailabilityExists(tenantId);

  const [availabilityRes, timeOffRes, moduleSettingsRes] = await Promise.all([
    service
      .from("appointment_availability")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("weekday", { ascending: true }),
    service
      .from("appointment_time_off")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
    service
      .from("tenant_modules")
      .select("settings")
      .eq("tenant_id", tenantId)
      .eq("module_id", "appointments")
      .maybeSingle()
  ]);

  if (availabilityRes.error) {
    console.error("Error fetching availability:", availabilityRes.error);
    return NextResponse.json({ error: "Error al obtener disponibilidad" }, { status: 500 });
  }

  // Extract breaks from module settings
  const breaks = moduleSettingsRes.data?.settings?.breaks || [];

  return NextResponse.json({
    availability: availabilityRes.data.map((a) => ({
      id: a.id,
      weekday: a.weekday,
      start: a.start_time,
      end: a.end_time
    })),
    timeOff: (timeOffRes.data ?? []).map((t) => ({
      id: t.id,
      startsAt: t.starts_at,
      endsAt: t.ends_at,
      reason: t.reason
    })),
    breaks: breaks.map((b: any) => ({
      weekday: b.weekday,
      start: b.start,
      end: b.end
    }))
  });
}