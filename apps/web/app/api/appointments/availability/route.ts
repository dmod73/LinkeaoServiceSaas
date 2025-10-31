/**
 * @file Availability route handler for appointments
 * Manages business hours configuration for authenticated users
 */

import { getServerSupabase } from "@/lib/supabase/server";
import { ensureAvailabilityExists } from "@/lib/features/appointments/defaultAvailability";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// GET handler - get availability
export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Try to get tenant_id from memberships first, fallback to profiles
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let tenantId = membership?.tenant_id;

  if (!tenantId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    tenantId = profile?.tenant_id;
  }

  if (!tenantId) {
    return NextResponse.json({ error: "Sin tenant" }, { status: 403 });
  }

  // Ensure default availability exists for this tenant
  await ensureAvailabilityExists(tenantId);

  const [availabilityRes, moduleSettingsRes] = await Promise.all([
    supabase
      .from("appointment_availability")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("weekday", { ascending: true }),
    supabase
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
    breaks: breaks.map((b: any) => ({
      weekday: b.weekday,
      start: b.start,
      end: b.end
    }))
  });
}

// POST handler - update availability (not used but kept for compatibility)
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Use PATCH /api/appointments/settings instead" }, { status: 400 });
}