import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getTenantContext, isModuleEnabledForTenant } from "@/lib/features/moduleAccess";
import { ensureAvailabilityExists } from "@/lib/features/appointments/defaultAvailability";
import type { Role } from "@core/shared";

type AvailabilityInput = {
  weekday: number;
  start: string;
  end: string;
};

type TimeOffInput = {
  id?: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
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
    const { tenantId } = await resolveTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    const enabled = await isModuleEnabledForTenant(tenantId, "invoice");
    if (!enabled) {
      return NextResponse.json({ availability: [], timeOff: [] });
    }

    const service = getServiceSupabase();

    // Check if tenant has settings with business_hours (new format)
    const { data: settings } = await service
      .from("appointments_settings")
      .select("business_hours, breaks")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    let availability: any[] = [];

    if (settings?.business_hours && Array.isArray(settings.business_hours)) {
      // Convert business_hours format to availability format
      // Dashboard uses: 1=Monday, 2=Tuesday, ..., 6=Saturday, 0=Sunday
      // We need: 0=Monday, 1=Tuesday, ..., 5=Saturday, 6=Sunday
      availability = settings.business_hours
        .filter((day: any) => day.start && day.end && day.start !== '' && day.end !== '')
        .map((day: any) => {
          const dashboardWeekday = Number(day.weekday);
          // Convert: dashboard 1-6 -> 0-5, dashboard 0 -> 6
          const normalizedWeekday = dashboardWeekday === 0 ? 6 : dashboardWeekday - 1;
          return {
            id: `${tenantId}-${normalizedWeekday}`,
            weekday: normalizedWeekday,
            start: day.start,
            end: day.end
          };
        });
    } else {
      // Fallback to appointments_availability table
      await ensureAvailabilityExists(tenantId);

      const { data: availabilityData, error: availabilityError } = await service
        .from("appointments_availability")
        .select("id, weekday, start_time, end_time")
        .eq("tenant_id", tenantId)
        .order("weekday", { ascending: true });

      if (availabilityError) {
        console.error("[invoice] availability list", availabilityError);
        return NextResponse.json({ error: "No pudimos cargar la disponibilidad" }, { status: 500 });
      }

      availability = (availabilityData ?? []).map((row) => ({
        id: row.id,
        weekday: row.weekday,
        start: row.start_time,
        end: row.end_time
      }));
    }

    const { data: timeOff, error: timeOffError } = await service
      .from("appointments_time_off")
      .select("id, starts_at, ends_at, reason")
      .eq("tenant_id", tenantId)
      .order("starts_at", { ascending: true });

    if (timeOffError) {
      console.error("[invoice] time off list", timeOffError);
      return NextResponse.json({ error: "No pudimos cargar los descansos" }, { status: 500 });
    }

    return NextResponse.json({
      availability,
      breaks: Array.isArray(settings?.breaks) ? settings.breaks.map((b: any) => {
        const dashboardWeekday = Number(b.weekday);
        const normalizedWeekday = dashboardWeekday === 0 ? 6 : dashboardWeekday - 1;
        return {
          weekday: normalizedWeekday,
          start: b.start,
          end: b.end
        };
      }) : [],
      timeOff: (timeOff ?? []).map((row) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        reason: row.reason
      }))
    });
  } catch (error) {
    console.error("[invoice] availability GET", error);
    return NextResponse.json({ error: "No pudimos obtener la disponibilidad" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const [currentUser, context] = await Promise.all([getCurrentUser(), resolveTenantIdFromRequest(req)]);

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!context.tenantId) {
      return NextResponse.json({ error: "Tenant no definido" }, { status: 400 });
    }

    if (!ensureOwnerRole(context.role ?? currentUser.role)) {
      return NextResponse.json({ error: "No tienes permisos para actualizar disponibilidad" }, { status: 403 });
    }

    const enabled = await isModuleEnabledForTenant(context.tenantId, "invoice");
    if (!enabled) {
  return NextResponse.json({ error: "El módulo Appointments no está habilitado" }, { status: 412 });
    }

    const body = (await req.json()) as {
      availability?: AvailabilityInput[];
      timeOff?: TimeOffInput[];
    };

    const availabilityEntries = Array.isArray(body.availability) ? body.availability : [];
    const timeOffEntries = Array.isArray(body.timeOff) ? body.timeOff : [];

    const service = getServiceSupabase();

    const availabilityPayload = availabilityEntries
      .filter((entry) => Number.isInteger(entry.weekday) && entry.start && entry.end)
      .map((entry) => ({
        tenant_id: context.tenantId,
        weekday: Math.max(0, Math.min(6, Number(entry.weekday))),
        start_time: entry.start,
        end_time: entry.end,
        updated_at: new Date().toISOString()
      }));

    const timeOffPayload = timeOffEntries
      .filter((entry) => entry.startsAt && entry.endsAt)
      .map((entry) => ({
        id: entry.id ?? undefined,
        tenant_id: context.tenantId,
        starts_at: entry.startsAt,
        ends_at: entry.endsAt,
        reason: entry.reason ?? null,
        updated_at: new Date().toISOString()
      }));

    const nowIso = new Date().toISOString();

    await service.from("appointments_availability").delete().eq("tenant_id", context.tenantId);
    if (availabilityPayload.length) {
      await service
        .from("appointments_availability")
        .insert(availabilityPayload.map((item) => ({ ...item, created_at: nowIso })));
    }

    await service.from("appointments_time_off").delete().eq("tenant_id", context.tenantId);
    if (timeOffPayload.length) {
      await service
        .from("appointments_time_off")
        .insert(timeOffPayload.map((item) => ({ ...item, created_at: nowIso })));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[invoice] availability PUT", error);
    return NextResponse.json({ error: "No pudimos actualizar la disponibilidad" }, { status: 500 });
  }
}
