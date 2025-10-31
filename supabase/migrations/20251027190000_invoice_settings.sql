-- Add invoice_settings table for per-tenant config (slot interval, etc)

create table if not exists public.invoice_settings (
  tenant_id text primary key references public.tenants(id) on delete cascade,
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Policy: only tenant admins can manage
alter table public.invoice_settings enable row level security;
create policy "invoice settings manage" on public.invoice_settings
  for all using (public.is_tenant_member(invoice_settings.tenant_id))
  with check (public.is_tenant_member(invoice_settings.tenant_id));
create policy "invoice settings read" on public.invoice_settings
  for select using (public.is_tenant_member(invoice_settings.tenant_id, array['member','admin','system_admin']::public.member_role[]));
