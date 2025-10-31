-- Rename invoice_settings table to appointments_settings
-- This completes the renaming of all invoice-related tables to appointments

begin;

-- Rename the table
alter table if exists public.invoice_settings rename to appointments_settings;

-- Recreate policies with correct table references
drop policy if exists "invoice settings manage" on public.appointments_settings;
drop policy if exists "invoice settings read" on public.appointments_settings;

create policy "appointments settings manage" on public.appointments_settings
  for all using (public.is_tenant_member(appointments_settings.tenant_id))
  with check (public.is_tenant_member(appointments_settings.tenant_id));

create policy "appointments settings read" on public.appointments_settings
  for select using (public.is_tenant_member(appointments_settings.tenant_id, array['member','admin','system_admin']::public.member_role[]));

commit;
