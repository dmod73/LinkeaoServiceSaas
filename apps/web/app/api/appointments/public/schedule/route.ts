/**
 * @file Public schedule route handler for appointments
 * Returns busy time slots for a specific date
 */

import { getServiceSupabase } from "@/lib/supabase/service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// GET handler - get public schedule
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get("tenant");
  const date = searchParams.get("date");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
  }

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const service = getServiceSupabase();

  // Get appointments for the date with correct column names
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data: appointments, error } = await service
    .from("appointment_appointments")
    .select("scheduled_start, scheduled_end, status")
    .eq("tenant_id", tenantId)
    .gte("scheduled_start", startOfDay)
    .lt("scheduled_end", endOfDay)
    .eq("status", "confirmed"); // Only block confirmed appointments

  if (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json({ error: "Error al obtener horario" }, { status: 500 });
  }

  const transformedAppointments = appointments.map((a) => ({
    startsAt: a.scheduled_start,
    endsAt: a.scheduled_end
  }));

  return NextResponse.json({
    appointments: transformedAppointments
  });
}