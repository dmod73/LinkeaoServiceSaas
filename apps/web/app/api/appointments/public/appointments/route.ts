/**
 * @file Public appointments route handler
 * Allows users to book appointments from the public view
 */

import { getServerSupabase } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// POST handler - create appointment from public view
export async function POST(request: NextRequest) {
  const supabase = await getServerSupabase();
  const body = await request.json();
  const { tenantId, serviceId, startsAt, clientId, client, note } = body;

  if (!tenantId || !serviceId || !startsAt) {
    return NextResponse.json({ error: "Datos incompletos: tenantId, serviceId y startsAt requeridos" }, { status: 400 });
  }

  // Validar que haya clientId O client
  if (!clientId && !client) {
    return NextResponse.json({ error: "Debe proporcionar clientId o información del cliente" }, { status: 400 });
  }

  // Si no hay clientId, validar datos del cliente
  if (!clientId && (!client.fullName || !client.email)) {
    return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Find or create client
  let finalClientId: string;

  if (clientId) {
    // NUEVO: Si ya tenemos clientId, usarlo directamente
    finalClientId = clientId;
  } else if (user) {
    // User is authenticated, try to find their client record
    const { data: existingClient } = await supabase
      .from("appointment_clients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingClient) {
      finalClientId = existingClient.id;
    } else {
      // Create new client linked to user
      const { data: newClient, error: clientError } = await supabase
        .from("appointment_clients")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          full_name: client.fullName,
          email: client.email,
          phone: client.phone
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        console.error("Error creating client:", clientError);
        return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
      }

      finalClientId = newClient.id;
    }
  } else {
    // User not authenticated, find or create client by email
    const { data: existingClient } = await supabase
      .from("appointment_clients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", client.email)
      .maybeSingle();

    if (existingClient) {
      finalClientId = existingClient.id;
    } else {
      // Create new client without user_id
      const { data: newClient, error: clientError } = await supabase
        .from("appointment_clients")
        .insert({
          tenant_id: tenantId,
          full_name: client.fullName,
          email: client.email,
          phone: client.phone
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        console.error("Error creating client:", clientError);
        return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
      }

      finalClientId = newClient.id;
    }
  }

  // Get service to calculate end time
  const { data: service } = await supabase
    .from("appointment_services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  const scheduledStart = new Date(startsAt);
  const scheduledEnd = new Date(scheduledStart.getTime() + (service?.duration_minutes || 30) * 60000);

  // NUEVO: Validar que el cliente no tenga otra cita el mismo día
  const startOfDay = new Date(scheduledStart);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(scheduledStart);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: existingAppointments, error: checkError } = await supabase
    .from("appointment_appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("client_id", finalClientId)
    .gte("scheduled_start", startOfDay.toISOString())
    .lte("scheduled_start", endOfDay.toISOString())
    .in("status", ["pending", "confirmed"]);

  if (checkError) {
    console.error("Error checking existing appointments:", checkError);
    // Continuar sin validación si hay error
  } else if (existingAppointments && existingAppointments.length > 0) {
    return NextResponse.json({ 
      error: "Ya tienes una cita agendada para este día. Solo puedes tener una cita por día."
    }, { status: 409 });
  }

  // Create appointment
  const { data: appointment, error } = await supabase
    .from("appointment_appointments")
    .insert({
      tenant_id: tenantId,
      client_id: finalClientId,
      service_id: serviceId,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: "pending",
      client_note: note,
      created_by: user?.id
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

  return NextResponse.json({ 
    appointment,
    message: "Cita creada correctamente. Pendiente de confirmación."
  });
}
