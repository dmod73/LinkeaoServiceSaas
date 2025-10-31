import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status") || "all";
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  // Query 1: Get all appointments for stats (only with date filters)
  let statsQuery = supabase
    .from("appointment_appointments")
    .select("id, status, scheduled_start")
    .eq("tenant_id", tenantId);

  if (dateFrom) {
    statsQuery = statsQuery.gte("scheduled_start", dateFrom);
  }

  if (dateTo) {
    // Add one day to include the entire end date
    const dateToEnd = new Date(dateTo);
    dateToEnd.setDate(dateToEnd.getDate() + 1);
    statsQuery = statsQuery.lt("scheduled_start", dateToEnd.toISOString().split('T')[0]);
  }

  const { data: statsAppointments } = await statsQuery;

  // Query 2: Get detailed appointments (with both date and status filters)
  let query = supabase
    .from("appointment_appointments")
    .select(`
      *,
      client:appointment_clients(*),
      service:appointment_services(*)
    `)
    .eq("tenant_id", tenantId);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (dateFrom) {
    query = query.gte("scheduled_start", dateFrom);
  }

  if (dateTo) {
    // Add one day to include the entire end date
    const dateToEnd = new Date(dateTo);
    dateToEnd.setDate(dateToEnd.getDate() + 1);
    query = query.lt("scheduled_start", dateToEnd.toISOString().split('T')[0]);
  }

  const { data: appointments, error } = await query.order("scheduled_start", { ascending: false });

  if (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Error al obtener reportes" }, { status: 500 });
  }

  // Calcular estadísticas basadas en TODAS las citas del rango de fechas
  const stats = {
    total: statsAppointments?.length || 0,
    pending: statsAppointments?.filter((a) => a.status === "pending").length || 0,
    confirmed: statsAppointments?.filter((a) => a.status === "confirmed").length || 0,
    completed: statsAppointments?.filter((a) => a.status === "completed").length || 0,
    cancelled: statsAppointments?.filter((a) => a.status === "cancelled").length || 0,
    rejected: statsAppointments?.filter((a) => a.status === "rejected").length || 0,
  };

  return NextResponse.json({ appointments: appointments || [], stats });
}
