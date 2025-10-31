-- Migration: Rename invoice_* tables to appointments_* (atomic rename)
-- Date: 2025-10-28
-- Purpose: Complete and safe renaming of all invoice infrastructure to appointments
-- This migration renames tables, enums, indexes, constraints, and policies in a single transaction

begin;

-- Step 1: Drop temporary views created in previous migration (no longer needed after table rename)
drop view if exists public.appointments_appointments cascade;
drop view if exists public.appointments_services cascade;
drop view if exists public.appointments_clients cascade;
drop view if exists public.appointments_availability cascade;
drop view if exists public.appointments_time_off cascade;

-- Step 2: Rename enum type
alter type public.invoice_appointment_status rename to appointments_appointment_status;

-- Step 3: Rename tables (preserves all data, foreign keys are automatically updated)
alter table public.invoice_services rename to appointments_services;
alter table public.invoice_clients rename to appointments_clients;
alter table public.invoice_availability rename to appointments_availability;
alter table public.invoice_time_off rename to appointments_time_off;
alter table public.invoice_appointments rename to appointments_appointments;

-- Step 4: Rename indexes for clarity and consistency
alter index if exists invoice_services_tenant_idx rename to appointments_services_tenant_idx;
alter index if exists invoice_clients_tenant_idx rename to appointments_clients_tenant_idx;
alter index if exists invoice_availability_tenant_idx rename to appointments_availability_tenant_idx;
alter index if exists invoice_time_off_tenant_idx rename to appointments_time_off_tenant_idx;
alter index if exists invoice_appointments_tenant_idx rename to appointments_appointments_tenant_idx;
alter index if exists invoice_appointments_client_idx rename to appointments_appointments_client_idx;

-- Step 5: Rename policies (RLS) for semantic clarity
-- Services policies
alter policy "invoice services read" on public.appointments_services rename to "appointments services read";
alter policy "invoice services manage" on public.appointments_services rename to "appointments services manage";

-- Clients policies
alter policy "invoice clients self read" on public.appointments_clients rename to "appointments clients self read";
alter policy "invoice clients self upsert" on public.appointments_clients rename to "appointments clients self upsert";
alter policy "invoice clients self update" on public.appointments_clients rename to "appointments clients self update";
alter policy "invoice clients member read" on public.appointments_clients rename to "appointments clients member read";
alter policy "invoice clients manage" on public.appointments_clients rename to "appointments clients manage";

-- Availability policies
alter policy "invoice availability manage" on public.appointments_availability rename to "appointments availability manage";
alter policy "invoice availability read" on public.appointments_availability rename to "appointments availability read";

-- Time off policies
alter policy "invoice time off manage" on public.appointments_time_off rename to "appointments time off manage";
alter policy "invoice time off read" on public.appointments_time_off rename to "appointments time off read";

-- Appointments policies
alter policy "invoice appointments client read" on public.appointments_appointments rename to "appointments appointments client read";
alter policy "invoice appointments client insert" on public.appointments_appointments rename to "appointments appointments client insert";
alter policy "invoice appointments client update" on public.appointments_appointments rename to "appointments appointments client update";
alter policy "invoice appointments member read" on public.appointments_appointments rename to "appointments appointments member read";
alter policy "invoice appointments manage" on public.appointments_appointments rename to "appointments appointments manage";

-- Step 6: Update policy definitions to reference new table names (policies use old table references internally)
-- We need to recreate policies because ALTER POLICY doesn't allow changing the USING/WITH CHECK expressions

-- Drop old policies and recreate with corrected table references
drop policy if exists "appointments services read" on public.appointments_services;
create policy "appointments services read" on public.appointments_services
  for select using (
    public.is_tenant_member(appointments_services.tenant_id, array['member','admin','system_admin']::public.member_role[])
  );

drop policy if exists "appointments services manage" on public.appointments_services;
create policy "appointments services manage" on public.appointments_services
  for all using (public.is_tenant_member(appointments_services.tenant_id))
  with check (public.is_tenant_member(appointments_services.tenant_id));

-- Clients policies
drop policy if exists "appointments clients self read" on public.appointments_clients;
create policy "appointments clients self read" on public.appointments_clients
  for select using (auth.uid() = appointments_clients.user_id);

drop policy if exists "appointments clients self upsert" on public.appointments_clients;
create policy "appointments clients self upsert" on public.appointments_clients
  for insert with check (auth.uid() = appointments_clients.user_id);

drop policy if exists "appointments clients self update" on public.appointments_clients;
create policy "appointments clients self update" on public.appointments_clients
  for update using (auth.uid() = appointments_clients.user_id)
  with check (auth.uid() = appointments_clients.user_id);

drop policy if exists "appointments clients member read" on public.appointments_clients;
create policy "appointments clients member read" on public.appointments_clients
  for select using (public.is_tenant_member(appointments_clients.tenant_id, array['member','admin','system_admin']::public.member_role[]));

drop policy if exists "appointments clients manage" on public.appointments_clients;
create policy "appointments clients manage" on public.appointments_clients
  for all using (public.is_tenant_member(appointments_clients.tenant_id))
  with check (public.is_tenant_member(appointments_clients.tenant_id));

-- Availability policies
drop policy if exists "appointments availability manage" on public.appointments_availability;
create policy "appointments availability manage" on public.appointments_availability
  for all using (public.is_tenant_member(appointments_availability.tenant_id))
  with check (public.is_tenant_member(appointments_availability.tenant_id));

drop policy if exists "appointments availability read" on public.appointments_availability;
create policy "appointments availability read" on public.appointments_availability
  for select using (public.is_tenant_member(appointments_availability.tenant_id, array['member','admin','system_admin']::public.member_role[]));

-- Time off policies
drop policy if exists "appointments time off manage" on public.appointments_time_off;
create policy "appointments time off manage" on public.appointments_time_off
  for all using (public.is_tenant_member(appointments_time_off.tenant_id))
  with check (public.is_tenant_member(appointments_time_off.tenant_id));

drop policy if exists "appointments time off read" on public.appointments_time_off;
create policy "appointments time off read" on public.appointments_time_off
  for select using (public.is_tenant_member(appointments_time_off.tenant_id, array['member','admin','system_admin']::public.member_role[]));

-- Appointments policies
drop policy if exists "appointments appointments client read" on public.appointments_appointments;
create policy "appointments appointments client read" on public.appointments_appointments
  for select using (
    auth.uid() = public.appointments_appointments.created_by 
    or auth.uid() = (select user_id from public.appointments_clients where id = public.appointments_appointments.client_id)
  );

drop policy if exists "appointments appointments client insert" on public.appointments_appointments;
create policy "appointments appointments client insert" on public.appointments_appointments
  for insert with check (auth.uid() = public.appointments_appointments.created_by);

drop policy if exists "appointments appointments client update" on public.appointments_appointments;
create policy "appointments appointments client update" on public.appointments_appointments
  for update using (auth.uid() = public.appointments_appointments.created_by)
  with check (auth.uid() = public.appointments_appointments.created_by);

drop policy if exists "appointments appointments member read" on public.appointments_appointments;
create policy "appointments appointments member read" on public.appointments_appointments
  for select using (public.is_tenant_member(public.appointments_appointments.tenant_id, array['member','admin','system_admin']::public.member_role[]));

drop policy if exists "appointments appointments manage" on public.appointments_appointments;
create policy "appointments appointments manage" on public.appointments_appointments
  for all using (public.is_tenant_member(public.appointments_appointments.tenant_id))
  with check (public.is_tenant_member(public.appointments_appointments.tenant_id));

commit;

-- Notes:
-- 1. This migration is atomic (wrapped in begin/commit transaction).
-- 2. All foreign key constraints are automatically updated by PostgreSQL when renaming tables.
-- 3. RLS policies are recreated to ensure correct table references.
-- 4. Indexes are renamed for consistency and clarity.
-- 5. The enum type is renamed to match new naming convention.
-- 6. All existing data is preserved; no data loss occurs during rename operations.
-- 7. After this migration, application code must be updated to reference appointments_* tables.
