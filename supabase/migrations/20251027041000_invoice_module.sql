-- Invoice module schema

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'invoice_appointment_status'
  ) THEN
    CREATE TYPE public.invoice_appointment_status AS ENUM (
      'pending',
      'confirmed',
      'rejected',
      'cancelled',
      'completed'
    );
  END IF;
END
$$;

create table if not exists public.invoice_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(12,2),
  currency text default 'USD',
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoice_clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id),
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, email)
);

create table if not exists public.invoice_availability (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoice_time_off (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoice_appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id uuid references public.invoice_clients(id) on delete set null,
  service_id uuid references public.invoice_services(id) on delete set null,
  status public.invoice_appointment_status not null default 'pending',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  client_note text,
  internal_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists invoice_services_tenant_idx on public.invoice_services (tenant_id);
create index if not exists invoice_clients_tenant_idx on public.invoice_clients (tenant_id);
create index if not exists invoice_availability_tenant_idx on public.invoice_availability (tenant_id, weekday);
create index if not exists invoice_time_off_tenant_idx on public.invoice_time_off (tenant_id, starts_at);
create index if not exists invoice_appointments_tenant_idx on public.invoice_appointments (tenant_id, scheduled_start);
create index if not exists invoice_appointments_client_idx on public.invoice_appointments (client_id, scheduled_start);

alter table public.invoice_services enable row level security;
alter table public.invoice_clients enable row level security;
alter table public.invoice_availability enable row level security;
alter table public.invoice_time_off enable row level security;
alter table public.invoice_appointments enable row level security;

-- Helpers
create or replace function public.is_tenant_member(target_tenant text, allowed_roles public.member_role[] default array['admin','system_admin']::public.member_role[])
returns boolean language sql as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = target_tenant
      and m.role = any (allowed_roles)
  );
$$;

-- Services policies
create policy "invoice services read" on public.invoice_services
  for select using (
    public.is_tenant_member(invoice_services.tenant_id, array['member','admin','system_admin']::public.member_role[])
  );

create policy "invoice services manage" on public.invoice_services
  for all using (public.is_tenant_member(invoice_services.tenant_id))
  with check (public.is_tenant_member(invoice_services.tenant_id));

-- Clients policies
create policy "invoice clients self read" on public.invoice_clients
  for select using (auth.uid() = invoice_clients.user_id);

create policy "invoice clients self upsert" on public.invoice_clients
  for insert with check (auth.uid() = invoice_clients.user_id);

create policy "invoice clients self update" on public.invoice_clients
  for update using (auth.uid() = invoice_clients.user_id)
  with check (auth.uid() = invoice_clients.user_id);

create policy "invoice clients member read" on public.invoice_clients
  for select using (public.is_tenant_member(invoice_clients.tenant_id, array['member','admin','system_admin']::public.member_role[]));

create policy "invoice clients manage" on public.invoice_clients
  for all using (public.is_tenant_member(invoice_clients.tenant_id))
  with check (public.is_tenant_member(invoice_clients.tenant_id));

-- Availability policies (only admin/system)
create policy "invoice availability manage" on public.invoice_availability
  for all using (public.is_tenant_member(invoice_availability.tenant_id))
  with check (public.is_tenant_member(invoice_availability.tenant_id));

create policy "invoice availability read" on public.invoice_availability
  for select using (public.is_tenant_member(invoice_availability.tenant_id, array['member','admin','system_admin']::public.member_role[]));

-- Time off policies
create policy "invoice time off manage" on public.invoice_time_off
  for all using (public.is_tenant_member(invoice_time_off.tenant_id))
  with check (public.is_tenant_member(invoice_time_off.tenant_id));

create policy "invoice time off read" on public.invoice_time_off
  for select using (public.is_tenant_member(invoice_time_off.tenant_id, array['member','admin','system_admin']::public.member_role[]));

-- Appointments policies
create policy "invoice appointments client read" on public.invoice_appointments
  for select using (auth.uid() = public.invoice_appointments.created_by or auth.uid() = (select user_id from public.invoice_clients where id = public.invoice_appointments.client_id));

create policy "invoice appointments client insert" on public.invoice_appointments
  for insert with check (auth.uid() = public.invoice_appointments.created_by);

create policy "invoice appointments client update" on public.invoice_appointments
  for update using (auth.uid() = public.invoice_appointments.created_by)
  with check (auth.uid() = public.invoice_appointments.created_by);

create policy "invoice appointments member read" on public.invoice_appointments
  for select using (public.is_tenant_member(public.invoice_appointments.tenant_id, array['member','admin','system_admin']::public.member_role[]));

create policy "invoice appointments manage" on public.invoice_appointments
  for all using (public.is_tenant_member(public.invoice_appointments.tenant_id))
  with check (public.is_tenant_member(public.invoice_appointments.tenant_id));

-- Register module
insert into public.modules (id, name, description, is_free)
values
  ('invoice', 'Invoice', 'Agenda inteligente con facturacion ligera y control de disponibilidad.', false)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_free = excluded.is_free;