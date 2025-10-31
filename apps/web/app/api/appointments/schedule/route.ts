/**
 * @file Public schedule route - returns confirmed appointments for a given date
 * Used by public booking view to show busy time slots
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const tenantId = searchParams.get("tenant");

    if (!date) {
      return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Query with correct column names: scheduled_start, scheduled_end
    const { data: appointments, error } = await supabase
      .from('appointment_appointments')
      .select('id, scheduled_start, scheduled_end, status')
      .eq('tenant_id', tenantId)
      .gte('scheduled_start', `${date}T00:00:00`)
      .lte('scheduled_start', `${date}T23:59:59`)
      .in('status', ['confirmed', 'pending']);

    if (error) {
      console.error("Error fetching schedule:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to camelCase format expected by frontend
    const transformedAppointments = (appointments || []).map((apt: any) => ({
      id: apt.id,
      startsAt: apt.scheduled_start,
      endsAt: apt.scheduled_end,
      status: apt.status
    }));

    return NextResponse.json({ appointments: transformedAppointments });
  } catch (error: any) {
    console.error("Schedule API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}