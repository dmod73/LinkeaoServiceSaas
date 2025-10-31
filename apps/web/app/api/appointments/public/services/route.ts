/**
 * @file Public services route handler for appointments
 * Returns active services for a tenant without authentication
 */

import { getServiceSupabase } from "@/lib/supabase/service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// GET handler - list public services
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get("tenant");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
  }

  const service = getServiceSupabase();

  const { data: services, error } = await service
    .from("appointment_services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching public services:", error);
    return NextResponse.json({ error: "Error al obtener servicios" }, { status: 500 });
  }

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.duration_minutes,
      price: s.price,
      currency: s.currency,
      isActive: s.is_active
    })),
  });
}