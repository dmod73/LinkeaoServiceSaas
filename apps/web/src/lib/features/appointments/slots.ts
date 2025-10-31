/**
 * @file Appointments slot generation utilities
 * Handles available time slot calculations for appointment booking
 */

import type { AppointmentAvailability, AppointmentTimeOff } from "./types";

// Common interface for availability (works with both Appointment and Invoice types)
type AvailabilityLike = {
  start?: string | null;
  end?: string | null;
};

type TimeOffLike = {
  startsAt: string;
  endsAt: string;
};

export type BusyInterval = {
  startsAt: string;
  endsAt: string;
};

export type BreakInterval = {
  weekday: number;
  start: string;
  end: string;
};

export type SlotCandidate = {
  isoStart: string;
  isoEnd: string;
  label: string;
};

function parseTime(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  return { hour: hour ?? 0, minute: minute ?? 0 };
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function buildSlotsForDate(options: {
  date: Date;
  durationMinutes: number;
  availability?: AvailabilityLike;
  timeOff?: TimeOffLike[];
  busy?: BusyInterval[];
  breaks?: BreakInterval[];
  stepMinutes?: number;
  blockPastSlots?: boolean;
}): SlotCandidate[] {
  const { date, durationMinutes, availability, timeOff = [], busy = [], breaks = [], stepMinutes = durationMinutes, blockPastSlots = false } = options;

  // Return empty if no availability or invalid duration
  if (!availability || !availability.start || !availability.end || !durationMinutes || durationMinutes <= 0) {
    return [];
  }

  const { hour: startHour, minute: startMinute } = parseTime(availability.start);
  const { hour: endHour, minute: endMinute } = parseTime(availability.end);

  const dayStart = new Date(date);
  dayStart.setHours(startHour, startMinute, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMinute, 0, 0);

  // Return empty if end is before or equal to start (invalid availability)
  if (dayEnd <= dayStart) return [];

  const timeOffRanges = timeOff.map((entry) => ({
    start: toDate(entry.startsAt),
    end: toDate(entry.endsAt)
  }));

  const busyRanges = busy.map((entry) => ({ start: toDate(entry.startsAt), end: toDate(entry.endsAt) }));

  // Convert breaks for this weekday to time ranges
  // Get the weekday index (0=Monday, ..., 6=Sunday)
  const jsDay = date.getDay();
  const weekdayIndex = jsDay === 0 ? 6 : jsDay - 1;
  
  const breakRanges = breaks
    .filter((b) => b.weekday === weekdayIndex)
    .map((b) => {
      const { hour: breakStartHour, minute: breakStartMinute } = parseTime(b.start);
      const { hour: breakEndHour, minute: breakEndMinute } = parseTime(b.end);
      const breakStart = new Date(date);
      breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
      const breakEnd = new Date(date);
      breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);
      return { start: breakStart, end: breakEnd };
    });

  const slots: SlotCandidate[] = [];
  const step = Math.max(stepMinutes, 5) * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;
  const now = new Date();

  for (let cursor = dayStart.getTime(); cursor + durationMs <= dayEnd.getTime() + 1; cursor += step) {
    const start = new Date(cursor);
    const end = new Date(cursor + durationMs);

    // Block past time slots if requested (for public view)
    if (blockPastSlots && start < now) {
      continue;
    }

    const blockedByTimeOff = timeOffRanges.some((range) => overlaps(start, end, range.start, range.end));
    if (blockedByTimeOff) continue;

    const blockedByBreak = breakRanges.some((range) => overlaps(start, end, range.start, range.end));
    if (blockedByBreak) continue;

    const blockedByAppointments = busyRanges.some((range) => overlaps(start, end, range.start, range.end));
    if (blockedByAppointments) continue;

    const label = start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    slots.push({
      isoStart: start.toISOString(),
      isoEnd: end.toISOString(),
      label
    });
  }

  return slots;
}
