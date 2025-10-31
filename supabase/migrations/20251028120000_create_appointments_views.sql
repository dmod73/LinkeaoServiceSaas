-- Migration: Create appointments_* view aliases for existing invoice_* tables
-- Date: 2025-10-28
-- Purpose: Provide DB-level aliases so both `invoice_*` and `appointments_*` names work
-- This is a backwards-compatible approach: it creates read-write views named
-- appointments_services, appointments_clients, appointments_availability,
-- appointments_time_off and appointments_appointments that proxy DML to the
-- existing invoice_* tables using PostgreSQL RULES. This avoids renaming tables
-- immediately and allows the application to migrate imports gradually.

begin;

-- Services
create or replace view public.appointments_services as select * from public.invoice_services;

create or replace rule appointments_services_insert as
  on insert to public.appointments_services do instead
    insert into public.invoice_services (id, tenant_id, name, description, duration_minutes, price, currency, is_active, created_at, updated_at)
    values (new.id, new.tenant_id, new.name, new.description, new.duration_minutes, new.price, new.currency, new.is_active, new.created_at, new.updated_at);

create or replace rule appointments_services_update as
  on update to public.appointments_services do instead
    update public.invoice_services set
      id = new.id,
      tenant_id = new.tenant_id,
      name = new.name,
      description = new.description,
      duration_minutes = new.duration_minutes,
      price = new.price,
      currency = new.currency,
      is_active = new.is_active,
      created_at = new.created_at,
      updated_at = new.updated_at
    where id = old.id;

create or replace rule appointments_services_delete as
  on delete to public.appointments_services do instead
    delete from public.invoice_services where id = old.id;

-- Clients
create or replace view public.appointments_clients as select * from public.invoice_clients;

create or replace rule appointments_clients_insert as
  on insert to public.appointments_clients do instead
    insert into public.invoice_clients (id, tenant_id, user_id, full_name, email, phone, created_at, updated_at)
    values (new.id, new.tenant_id, new.user_id, new.full_name, new.email, new.phone, new.created_at, new.updated_at);

create or replace rule appointments_clients_update as
  on update to public.appointments_clients do instead
    update public.invoice_clients set
      id = new.id,
      tenant_id = new.tenant_id,
      user_id = new.user_id,
      full_name = new.full_name,
      email = new.email,
      phone = new.phone,
      created_at = new.created_at,
      updated_at = new.updated_at
    where id = old.id;

create or replace rule appointments_clients_delete as
  on delete to public.appointments_clients do instead
    delete from public.invoice_clients where id = old.id;

-- Availability
create or replace view public.appointments_availability as select * from public.invoice_availability;

create or replace rule appointments_availability_insert as
  on insert to public.appointments_availability do instead
    insert into public.invoice_availability (id, tenant_id, weekday, start_time, end_time, created_at, updated_at)
    values (new.id, new.tenant_id, new.weekday, new.start_time, new.end_time, new.created_at, new.updated_at);

create or replace rule appointments_availability_update as
  on update to public.appointments_availability do instead
    update public.invoice_availability set
      id = new.id,
      tenant_id = new.tenant_id,
      weekday = new.weekday,
      start_time = new.start_time,
      end_time = new.end_time,
      created_at = new.created_at,
      updated_at = new.updated_at
    where id = old.id;

create or replace rule appointments_availability_delete as
  on delete to public.appointments_availability do instead
    delete from public.invoice_availability where id = old.id;

-- Time off
create or replace view public.appointments_time_off as select * from public.invoice_time_off;

create or replace rule appointments_time_off_insert as
  on insert to public.appointments_time_off do instead
    insert into public.invoice_time_off (id, tenant_id, starts_at, ends_at, reason, created_at, updated_at)
    values (new.id, new.tenant_id, new.starts_at, new.ends_at, new.reason, new.created_at, new.updated_at);

create or replace rule appointments_time_off_update as
  on update to public.appointments_time_off do instead
    update public.invoice_time_off set
      id = new.id,
      tenant_id = new.tenant_id,
      starts_at = new.starts_at,
      ends_at = new.ends_at,
      reason = new.reason,
      created_at = new.created_at,
      updated_at = new.updated_at
    where id = old.id;

create or replace rule appointments_time_off_delete as
  on delete to public.appointments_time_off do instead
    delete from public.invoice_time_off where id = old.id;

-- Appointments
create or replace view public.appointments_appointments as select * from public.invoice_appointments;

create or replace rule appointments_appointments_insert as
  on insert to public.appointments_appointments do instead
    insert into public.invoice_appointments (id, tenant_id, client_id, service_id, status, scheduled_start, scheduled_end, client_note, internal_note, created_by, created_at, updated_at)
    values (new.id, new.tenant_id, new.client_id, new.service_id, new.status, new.scheduled_start, new.scheduled_end, new.client_note, new.internal_note, new.created_by, new.created_at, new.updated_at);

create or replace rule appointments_appointments_update as
  on update to public.appointments_appointments do instead
    update public.invoice_appointments set
      id = new.id,
      tenant_id = new.tenant_id,
      client_id = new.client_id,
      service_id = new.service_id,
      status = new.status,
      scheduled_start = new.scheduled_start,
      scheduled_end = new.scheduled_end,
      client_note = new.client_note,
      internal_note = new.internal_note,
      created_by = new.created_by,
      created_at = new.created_at,
      updated_at = new.updated_at
    where id = old.id;

create or replace rule appointments_appointments_delete as
  on delete to public.appointments_appointments do instead
    delete from public.invoice_appointments where id = old.id;

commit;

-- Notes:
-- 1) These views + rules make the "appointments_*" names behave like tables that
--    read/write to the existing "invoice_*" tables. This preserves existing
--    data and policies while allowing the application to switch imports to
--    "appointments_*" names gradually.
-- 2) Row Level Security (policies) remain defined on the base tables
--    (invoice_*). The views inherit the effect of SELECT, but INSERT/UPDATE/DELETE
--    will operate on the base tables and are therefore subject to the same policies.
-- 3) After the application has migrated and tested, you may choose to drop the
--    invoice_* tables and rename the base tables, or keep these aliases indefinitely.
