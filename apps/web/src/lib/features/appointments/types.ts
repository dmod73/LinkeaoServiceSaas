/**
 * @file Appointments module type definitions
 * Core types for the appointments booking system
 */

export type AppointmentService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string | null;
  isActive: boolean;
};

export type AppointmentClient = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AppointmentAvailability = {
  id?: string;
  weekday: number;
  start: string;
  end: string;
};

export type AppointmentTimeOff = {
  id?: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
};

export type AppointmentStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";

export type Appointment = {
  id: string;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  createdAt?: string;
  note: string | null;
  internalNote: string | null;
  service: AppointmentService | null;
  client: AppointmentClient | null;
};

export type AppointmentDashboardSummary = {
  pending: number;
  confirmed: number;
  rejected: number;
  cancelled: number;
  completed: number;
};

// Legacy exports for backwards compatibility - will be removed in next major version
export type InvoiceService = AppointmentService;
export type InvoiceClient = AppointmentClient;
export type InvoiceAvailability = AppointmentAvailability;
export type InvoiceTimeOff = AppointmentTimeOff;
export type InvoiceAppointmentStatus = AppointmentStatus;
export type InvoiceAppointment = Appointment;
export type InvoiceDashboardSummary = AppointmentDashboardSummary;
