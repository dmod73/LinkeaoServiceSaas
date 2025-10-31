import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant");

  if (!tenantId) {
    return NextResponse.json({ error: "tenant parameter is required" }, { status: 400 });
  }

  try {
    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[MY-APPOINTMENTS] User not authenticated");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("[MY-APPOINTMENTS] User authenticated:", user.id, user.email);

    // Obtener el cliente asociado al usuario
    const { data: client, error: clientError } = await supabase
      .from("appointment_clients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

    console.log("[MY-APPOINTMENTS] Client lookup result:", { client, clientError });

    if (clientError || !client) {
      console.log("[MY-APPOINTMENTS] No client found for user, returning empty array");
      return NextResponse.json({ appointments: [] });
    }

    console.log("[MY-APPOINTMENTS] Client found:", client.id);

    console.log("[MY-APPOINTMENTS] Client found:", client.id);

    // Obtener todas las citas del cliente con información completa
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointment_appointments")
      .select(`
        id,
        scheduled_start,
        scheduled_end,
        status,
        client_note,
        created_at,
        service:service_id(id, name, duration_minutes, price)
      `)
      .eq("tenant_id", tenantId)
      .eq("client_id", client.id)
      .order("scheduled_start", { ascending: false });

    console.log("[MY-APPOINTMENTS] Appointments query result:", { 
      count: appointments?.length || 0, 
      error: appointmentsError,
      tenantId,
      clientId: client.id
    });

    if (appointmentsError) {
      console.error("[MY-APPOINTMENTS] Error fetching appointments:", appointmentsError);
      return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
    }

    return NextResponse.json({ appointments: appointments || [] });
  } catch (error) {
    console.error("[MY-APPOINTMENTS] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant");
  const body = await req.json();
  const { appointmentId } = body;

  if (!tenantId || !appointmentId) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Obtener el cliente asociado al usuario
    const { data: client, error: clientError } = await supabase
      .from("appointment_clients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Verificar que la cita pertenece al usuario y obtener su estado
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointment_appointments")
      .select("id, status, client_id")
      .eq("id", appointmentId)
      .eq("tenant_id", tenantId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.client_id !== client.id) {
      return NextResponse.json({ error: "Unauthorized to cancel this appointment" }, { status: 403 });
    }

    // Solo permitir cancelar citas pendientes o confirmadas
    if (appointment.status !== "pending" && appointment.status !== "confirmed") {
      return NextResponse.json({ 
        error: "Only pending or confirmed appointments can be cancelled" 
      }, { status: 400 });
    }

    // Cancelar la cita
    const { error: updateError } = await supabase
      .from("appointment_appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (updateError) {
      console.error("[CANCEL-APPOINTMENT] Error:", updateError);
      return NextResponse.json({ error: "Failed to cancel appointment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Appointment cancelled successfully" });
  } catch (error) {
    console.error("[CANCEL-APPOINTMENT] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
