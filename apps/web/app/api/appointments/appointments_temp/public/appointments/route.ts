import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isModuleEnabledForTenant } from "@/lib/features/moduleAccess";

type Body = {
  serviceId: string;
  startsAt: string;
  endsAt?: string | null;
  client?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
  };
  note?: string | null;
};

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant") ?? req.headers.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });

  const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
  if (!enabled) return NextResponse.json({ error: "Módulo Appointments deshabilitado" }, { status: 412 });

    const body = (await req.json()) as Body;
    const serviceId = body.serviceId?.trim();
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;

    if (!serviceId || !startsAt || Number.isNaN(startsAt.valueOf())) {
      return NextResponse.json({ error: "Servicio y fecha valida son requeridos" }, { status: 400 });
    }

    const serviceClient = getServiceSupabase();
    const { data: serviceRow } = await serviceClient
      .from("appointments_services")
      .select("id, duration_minutes")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .maybeSingle();

    if (!serviceRow) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

    const durationMinutes = serviceRow.duration_minutes ?? 30;
    const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(startsAt.getTime() + durationMinutes * 60000);
    if (Number.isNaN(endsAt.valueOf())) return NextResponse.json({ error: "Fecha de termino invalida" }, { status: 400 });

    // overlap check
    const { data: overlapping, error: overlapError } = await serviceClient
      .from("appointments_appointments")
      .select("id")
      .eq("tenant_id", tenantId)
      .lt("scheduled_start", endsAt.toISOString())
      .gt("scheduled_end", startsAt.toISOString())
      .not("status", "in", "(rejected,cancelled)");

    if (overlapError) {
      console.error("[invoice] public appointment overlap check", overlapError);
      return NextResponse.json({ error: "No pudimos verificar disponibilidad" }, { status: 500 });
    }
    if ((overlapping ?? []).length > 0) return NextResponse.json({ error: "El horario ya esta ocupado" }, { status: 409 });

    // upsert/find client by email or phone
    let clientId: string | null = null;
    if (body.client?.fullName) {
      const email = body.client.email?.trim()?.toLowerCase() ?? null;
      const phone = body.client.phone?.trim() ?? null;
      if (email) {
        const { data: byEmail } = await serviceClient
          .from("appointments_clients")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("email", email)
          .maybeSingle();
        if (byEmail) clientId = byEmail.id;
      }
      if (!clientId && phone) {
        const { data: byPhone } = await serviceClient
          .from("appointments_clients")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("phone", phone)
          .maybeSingle();
        if (byPhone) clientId = byPhone.id;
      }
      if (!clientId) {
        const { data: newClient, error } = await serviceClient
          .from("appointments_clients")
          .insert({ tenant_id: tenantId, full_name: body.client.fullName.trim(), email: body.client.email?.trim() ?? null, phone: body.client.phone?.trim() ?? null })
          .select("id, full_name, email, phone")
          .single();
        if (error || !newClient) {
          console.error("[invoice] public client create", error);
          return NextResponse.json({ error: "No pudimos registrar al cliente" }, { status: 500 });
        }
        clientId = newClient.id;
      }
    }

    const { data: appointment, error: appointmentError } = await serviceClient
      .from("appointments_appointments")
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        service_id: serviceId,
        status: "pending",
        scheduled_start: startsAt.toISOString(),
        scheduled_end: endsAt.toISOString(),
        client_note: body.note ?? null,
        created_by: null
      })
      .select(
        "id, status, scheduled_start, scheduled_end, client_note, internal_note, created_at, appointments_clients (id, full_name, email, phone), appointments_services (id, name, duration_minutes, price, currency)"
      )
      .single();

    if (appointmentError || !appointment) {
      console.error("[invoice] public appointment insert", appointmentError);
      return NextResponse.json({ error: "No pudimos crear la cita" }, { status: 500 });
    }

    return NextResponse.json({ appointment });
  } catch (err) {
    console.error("[invoice] public appointment POST", err);
    return NextResponse.json({ error: "No pudimos crear la cita" }, { status: 500 });
  }
}
