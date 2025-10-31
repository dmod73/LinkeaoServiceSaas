/**
 * @file Appointments dashboard data fetching
 * Fetches dashboard summary and upcoming appointments
 */

import { getServiceSupabase } from "@/lib/supabase/service";
import { getTenantContext, isModuleEnabled } from "@/lib/features/moduleAccess";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentAvailability,
  AppointmentDashboardSummary,
  AppointmentTimeOff
} from "./types";

const STATUSES: AppointmentStatus[] = ["pending", "confirmed", "rejected", "cancelled", "completed"];

type AppointmentQueryRow = {
  id: string;
  status: AppointmentStatus;
  scheduled_start: string;
  scheduled_end: string;
  client_note: string | null;
  internal_note: string | null;
  created_at: string;
  appointment_services: {
    id: string;
    name: string;
    duration_minutes: number;
    price: number | null;
    currency: string | null;
  } | null;
  appointment_clients: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

type AvailabilityRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

type TimeOffRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type AppointmentDashboardData = {
  enabled: false;
} | {
  enabled: true;
  summary: AppointmentDashboardSummary;
  upcoming: Appointment[];
  availability: AppointmentAvailability[];
  timeOff: AppointmentTimeOff[];
};

export async function fetchAppointmentDashboardData(): Promise<AppointmentDashboardData> {
  const context = await getTenantContext();
  if (!context?.tenantId) return { enabled: false };

  const enabled = await isModuleEnabled("appointments");
  if (!enabled) return { enabled: false };

  const service = getServiceSupabase();
  const nowIso = new Date().toISOString();

  const [appointmentsRes, statusRes, availabilityRes, timeOffRes] = await Promise.all([
    service
      .from("appointment_appointments")
      .select(
        `id, status, scheduled_start, scheduled_end, client_note, internal_note, created_at,
         appointment_services (id, name, duration_minutes, price, currency),
         appointment_clients (id, full_name, email, phone)`
      )
      .eq("tenant_id", context.tenantId)
      .gte("scheduled_start", nowIso)
      .order("scheduled_start", { ascending: true })
      .limit(12),
    service
      .from("appointment_appointments")
      .select("status")
      .eq("tenant_id", context.tenantId),
    service
      .from("appointment_availability")
      .select("id, weekday, start_time, end_time")
      .eq("tenant_id", context.tenantId)
      .order("weekday", { ascending: true }),
    service
      .from("appointment_time_off")
      .select("id, starts_at, ends_at, reason")
      .eq("tenant_id", context.tenantId)
      .order("starts_at", { ascending: true })
  ]);

  if (appointmentsRes.error || statusRes.error || availabilityRes.error || timeOffRes.error) {
    console.error("[appointments] dashboard fetch", appointmentsRes.error, statusRes.error, availabilityRes.error, timeOffRes.error);
    return { enabled: false };
  }

  const summary: AppointmentDashboardSummary = {
    pending: 0,
    confirmed: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0
  };

  const statusRows = (statusRes.data ?? []) as { status: AppointmentStatus | null }[];
  statusRows.forEach(({ status }) => {
    if (status && STATUSES.includes(status)) {
      summary[status] += 1;
    }
  });

  const appointmentRows = (appointmentsRes.data ?? []) as unknown as AppointmentQueryRow[];
  const upcoming: Appointment[] = appointmentRows.map((row) => {
    return {
      id: row.id,
      status: row.status as AppointmentStatus,
      startsAt: row.scheduled_start,
      endsAt: row.scheduled_end,
      createdAt: row.created_at,
      note: row.client_note,
      internalNote: row.internal_note,
      service: row.appointment_services
        ? {
            id: row.appointment_services.id,
            name: row.appointment_services.name,
            description: null,
            durationMinutes: row.appointment_services.duration_minutes,
            price: row.appointment_services.price,
            currency: row.appointment_services.currency,
            isActive: true
          }
        : null,
      client: row.appointment_clients
        ? {
            id: row.appointment_clients.id,
            fullName: row.appointment_clients.full_name,
            email: row.appointment_clients.email,
            phone: row.appointment_clients.phone
          }
        : null
    };
  });

  const availabilityRows = (availabilityRes.data ?? []) as AvailabilityRow[];
  const availability: AppointmentAvailability[] = availabilityRows.map((row) => ({
    id: row.id,
    weekday: row.weekday,
    start: row.start_time,
    end: row.end_time
  }));

  const timeOffRows = (timeOffRes.data ?? []) as TimeOffRow[];
  const timeOff: AppointmentTimeOff[] = timeOffRows.map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    reason: row.reason
  }));

  STATUSES.forEach((status) => {
    if (!(status in summary)) {
      summary[status] = 0;
    }
  });

  return {
    enabled: true,
    summary,
    upcoming,
    availability,
    timeOff
  };
}

// Legacy export for backwards compatibility - will be removed in next major version
export { fetchAppointmentDashboardData as fetchInvoiceDashboardData };
export type { AppointmentDashboardData as InvoiceDashboardData };
