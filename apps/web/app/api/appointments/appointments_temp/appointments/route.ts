import { NextResponse } from "next/server";
import type { Role } from "@core/shared";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getTenantContext, isModuleEnabledForTenant } from "@/lib/features/moduleAccess";

type AppointmentCreateBody = {
  serviceId: string;
  startsAt: string;
  endsAt?: string | null;
  clientId?: string;
  client?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
  };
  note?: string | null;
  status?: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
};

type AppointmentUpdateBody = {
  id: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  internalNote?: string | null;
};

type ServiceRow = {
  id: string;
  duration_minutes: number;
};

type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

type AppointmentRow = {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  client_note: string | null;
  internal_note: string | null;
  appointments_services: {
    id: string;
    name: string;
    duration_minutes: number;
    price: number | null;
    currency: string | null;
  } | null;
  appointments_clients: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

const OWNER_ROLES: Role[] = ["admin", "system_admin"];

function ensureOwnerRole(role: Role | null | undefined): role is "admin" | "system_admin" {
  return Boolean(role && OWNER_ROLES.includes(role));
}

async function resolveTenantIdFromRequest(req?: Request): Promise<{ tenantId: string | null; role: Role | null }> {
  const headerTenant = req?.headers.get("x-tenant-id");
  const context = await getTenantContext();
  const tenantId = context?.tenantId ?? headerTenant ?? null;
  const role = context?.role ?? null;
  return { tenantId, role };
}

export async function GET(req: Request) {
  try {
    const [currentUser, context] = await Promise.all([getCurrentUser(), resolveTenantIdFromRequest(req)]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const tenantId = context.tenantId ?? req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    const moduleEnabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!moduleEnabled) {
      return NextResponse.json({ appointments: [] });
    }

    const isOwner = ensureOwnerRole(context.role ?? currentUser.role);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const service = getServiceSupabase();
    let query = service
      .from("appointments_appointments")
      .select(
        `id, tenant_id, client_id, service_id, status, scheduled_start, scheduled_end, client_note, internal_note, created_at, updated_at,
         appointments_clients (id, full_name, email, phone),
         appointments_services (id, name, duration_minutes, price, currency)`
      )
      .eq("tenant_id", tenantId)
      .order("scheduled_start", { ascending: true });

    if (!isOwner) {
      query = query.eq("created_by", currentUser.id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (from) {
      query = query.gte("scheduled_start", from);
    }

    if (to) {
      query = query.lte("scheduled_end", to);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[invoice] appointments list", error);
      return NextResponse.json({ error: "No pudimos cargar las citas" }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as AppointmentRow[];

    return NextResponse.json({
      appointments: rows.map((row) => ({
        id: row.id,
        status: row.status,
        startsAt: row.scheduled_start,
        endsAt: row.scheduled_end,
        note: row.client_note,
        internalNote: row.internal_note,
        service: row.appointments_services
          ? {
              id: row.appointments_services.id,
              name: row.appointments_services.name,
              durationMinutes: row.appointments_services.duration_minutes,
              price: row.appointments_services.price,
              currency: row.appointments_services.currency
            }
          : null,
        client: row.appointments_clients
          ? {
              id: row.appointments_clients.id,
              fullName: row.appointments_clients.full_name,
              email: row.appointments_clients.email,
              phone: row.appointments_clients.phone
            }
          : null
      }))
    });
  } catch (error) {
    console.error("[invoice] appointments GET", error);
    return NextResponse.json({ error: "No pudimos obtener las citas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const [currentUser, context] = await Promise.all([getCurrentUser(), resolveTenantIdFromRequest(req)]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const tenantId = context.tenantId ?? req.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    const moduleEnabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!moduleEnabled) {
      return NextResponse.json({ error: "El módulo Appointments no está habilitado" }, { status: 412 });
    }

    const body = (await req.json()) as AppointmentCreateBody;
    const serviceId = body.serviceId?.trim();
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;

    if (!serviceId || !startsAt || Number.isNaN(startsAt.valueOf())) {
      return NextResponse.json({ error: "Servicio y fecha valida son requeridos" }, { status: 400 });
    }

    const serviceClient = getServiceSupabase();
    const { data: serviceRow, error: serviceError } = await serviceClient
      .from("appointments_services")
      .select("id, duration_minutes")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .maybeSingle<ServiceRow>();

    if (serviceError || !serviceRow) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const durationMinutes = serviceRow.duration_minutes ?? 30;
    const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(startsAt.getTime() + durationMinutes * 60000);

    if (Number.isNaN(endsAt.valueOf())) {
      return NextResponse.json({ error: "Fecha de termino invalida" }, { status: 400 });
    }

    // Prevent overlapping appointments for the tenant (pending/confirmed)
    const { data: overlapping, error: overlapError } = await serviceClient
      .from("appointments_appointments")
      .select("id")
      .eq("tenant_id", tenantId)
      .lt("scheduled_start", endsAt.toISOString())
      .gt("scheduled_end", startsAt.toISOString())
      .not("status", "in", "(rejected,cancelled)");

    if (overlapError) {
      console.error("[invoice] appointment overlap check", overlapError);
      return NextResponse.json({ error: "No pudimos verificar disponibilidad" }, { status: 500 });
    }

    if ((overlapping ?? []).length > 0) {
      return NextResponse.json({ error: "El horario ya esta ocupado" }, { status: 409 });
    }

    const isOwner = ensureOwnerRole(context.role ?? currentUser.role);

    let clientId = body.clientId?.trim() ?? null;

    // If client details provided, try to reuse existing client by email or phone
    if (!clientId && body.client?.fullName) {
      const email = body.client.email?.trim()?.toLowerCase() ?? null;
      const phone = body.client.phone?.trim() ?? null;

      if (email) {
        const { data: byEmail } = await serviceClient
          .from("appointments_clients")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("email", email)
          .maybeSingle<ClientRow>();
        if (byEmail) clientId = byEmail.id;
      }

      if (!clientId && phone) {
        const { data: byPhone } = await serviceClient
          .from("appointments_clients")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("phone", phone)
          .maybeSingle<ClientRow>();
        if (byPhone) clientId = byPhone.id;
      }

      if (!clientId) {
        // create new client (no user_id for public submissions)
        const { data: newClient, error: newClientError } = await serviceClient
          .from("appointments_clients")
          .insert({
            tenant_id: tenantId,
            user_id: currentUser?.id ?? null,
            full_name: body.client.fullName.trim(),
            email: body.client.email?.trim()?.toLowerCase() ?? null,
            phone: body.client.phone?.trim() ?? null
          })
          .select("id")
          .single<ClientRow>();

        if (newClientError || !newClient) {
          console.error("[invoice] appointment client create", newClientError);
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
        status: isOwner && body.status ? body.status : "pending",
        scheduled_start: startsAt.toISOString(),
        scheduled_end: endsAt.toISOString(),
        client_note: body.note ?? null,
        created_by: currentUser.id
      })
      .select(
        "id, status, scheduled_start, scheduled_end, client_note, internal_note, created_at, appointments_clients (id, full_name, email, phone), appointments_services (id, name, duration_minutes, price, currency)"
      )
      .single<AppointmentRow>();

    if (appointmentError || !appointment) {
      console.error("[invoice] appointment insert", appointmentError);
      return NextResponse.json({ error: "No pudimos crear la cita" }, { status: 500 });
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        status: appointment.status,
        startsAt: appointment.scheduled_start,
        endsAt: appointment.scheduled_end,
        note: appointment.client_note,
        internalNote: appointment.internal_note,
        service: appointment.appointments_services
          ? {
              id: appointment.appointments_services.id,
              name: appointment.appointments_services.name,
              durationMinutes: appointment.appointments_services.duration_minutes,
              price: appointment.appointments_services.price,
              currency: appointment.appointments_services.currency
            }
          : null,
        client: appointment.appointments_clients
          ? {
              id: appointment.appointments_clients.id,
              fullName: appointment.appointments_clients.full_name,
              email: appointment.appointments_clients.email,
              phone: appointment.appointments_clients.phone
            }
          : null
      }
    });
  } catch (error) {
    console.error("[invoice] appointment POST", error);
    return NextResponse.json({ error: "No pudimos crear la cita" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const [currentUser, context] = await Promise.all([getCurrentUser(), resolveTenantIdFromRequest(req)]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!context.tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    if (!ensureOwnerRole(context.role ?? currentUser.role)) {
      return NextResponse.json({ error: "No tienes permisos para actualizar citas" }, { status: 403 });
    }

    const moduleEnabled = await isModuleEnabledForTenant(context.tenantId, "invoice");
    if (!moduleEnabled) {
      return NextResponse.json({ error: "El módulo Appointments no está habilitado" }, { status: 412 });
    }

    const body = (await req.json()) as AppointmentUpdateBody;
    const id = body.id?.trim();

    if (!id || !body.status) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const service = getServiceSupabase();
    const { error } = await service
      .from("appointments_appointments")
      .update({
        status: body.status,
        internal_note: body.internalNote ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("tenant_id", context.tenantId)
      .eq("id", id);

    if (error) {
      console.error("[invoice] appointment PATCH", error);
      return NextResponse.json({ error: "No pudimos actualizar la cita" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[invoice] appointment PATCH", error);
    return NextResponse.json({ error: "No pudimos actualizar la cita" }, { status: 500 });
  }
}
