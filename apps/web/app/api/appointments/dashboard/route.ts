import { NextResponse } from "next/server";
import { fetchAppointmentDashboardData } from "@/lib/features/appointments/dashboard";

export async function GET() {
  try {
    const data = await fetchAppointmentDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[appointments/dashboard] Error:", error);
    return NextResponse.json({ enabled: false }, { status: 500 });
  }
}
