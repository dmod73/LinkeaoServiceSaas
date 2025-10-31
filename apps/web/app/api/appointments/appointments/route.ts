import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { clientId, newClient, serviceId, startsAt, note } = body;

  let finalClientId = clientId;

  // Si es un nuevo cliente, crearlo primero
  if (newClient && !clientId) {
    const { data: client, error: clientError } = await supabase
      .from("appointment_clients")
      .insert({
        tenant_id: tenantId,
        full_name: newClient.fullName,
        email: newClient.email,
        phone: newClient.phone,
      })
      .select()
      .single();

    if (clientError || !client) {
      console.error("Error creating client:", clientError);
      return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
    }

    finalClientId = client.id;
  }

  if (!finalClientId || !serviceId || !startsAt) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Get service to calculate end time
  const { data: service } = await supabase
    .from("appointment_services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  const scheduledStart = new Date(startsAt);
  const scheduledEnd = new Date(scheduledStart.getTime() + (service?.duration_minutes || 30) * 60000);

  // Crear la cita
  const { data: appointment, error } = await supabase
    .from("appointment_appointments")
    .insert({
      tenant_id: tenantId,
      client_id: finalClientId,
      service_id: serviceId,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: "confirmed",
      client_note: note,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ 
      error: `Error al crear cita: ${error.message}`,
      details: error 
    }, { status: 500 });
  }

  return NextResponse.json({ appointment });
}

export async function DELETE(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID de cita requerido" }, { status: 400 });
  }

  // Verificar que la cita pertenece al tenant antes de eliminar
  const { data: appointment } = await supabase
    .from("appointment_appointments")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada o no autorizada" }, { status: 404 });
  }

  // Eliminar la cita
  const { error } = await supabase
    .from("appointment_appointments")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ error: "Error al eliminar cita" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Cita eliminada correctamente" });
}
export async function PATCH(req: NextRequest) {
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

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Actualizar estado de la cita
  const { data: appointment, error } = await supabase
    .from("appointment_appointments")
    .update({ status })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Error al actualizar cita" }, { status: 500 });
  }

  return NextResponse.json({ appointment });
}
