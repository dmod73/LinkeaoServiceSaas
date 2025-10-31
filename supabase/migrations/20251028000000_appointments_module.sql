-- Appointments module schema (separate from invoice)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'appointment_status'
  ) THEN
    CREATE TYPE public.appointment_status AS ENUM (
      'pending',
      'confirmed',
      'rejected',
      'cancelled',
      'completed'
    );
  END IF;
END
$$;

create table if not exists public.appointment_services (
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

create table if not exists public.appointment_clients (
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

create table if not exists public.appointment_availability (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.appointment_time_off (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.appointment_appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  client_id uuid references public.appointment_clients(id) on delete set null,
  service_id uuid references public.appointment_services(id) on delete set null,
  status public.appointment_status not null default 'pending',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  client_note text,
  internal_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists appointment_services_tenant_idx on public.appointment_services (tenant_id);
create index if not exists appointment_clients_tenant_idx on public.appointment_clients (tenant_id);
create index if not exists appointment_availability_tenant_idx on public.appointment_availability (tenant_id, weekday);
create index if not exists appointment_time_off_tenant_idx on public.appointment_time_off (tenant_id, starts_at);
create index if not exists appointment_appointments_tenant_idx on public.appointment_appointments (tenant_id, scheduled_start);
create index if not exists appointment_appointments_client_idx on public.appointment_appointments (client_id, scheduled_start);

alter table public.appointment_services enable row level security;
alter table public.appointment_clients enable row level security;
alter table public.appointment_availability enable row level security;
alter table public.appointment_time_off enable row level security;
alter table public.appointment_appointments enable row level security;

-- Services policies
create policy "appointment services read" on public.appointment_services
  for select using (
    public.is_tenant_member(appointment_services.tenant_id, array['member','admin','system_admin']::public.member_role[])
  );

create policy "appointment services manage" on public.appointment_services
  for all using (public.is_tenant_member(appointment_services.tenant_id))
  with check (public.is_tenant_member(appointment_services.tenant_id));

-- Clients policies
create policy "appointment clients self read" on public.appointment_clients
  for select using (auth.uid() = appointment_clients.user_id);

create policy "appointment clients self upsert" on public.appointment_clients
  for insert with check (auth.uid() = appointment_clients.user_id);

create policy "appointment clients self update" on public.appointment_clients
  for update using (auth.uid() = appointment_clients.user_id)
  with check (auth.uid() = appointment_clients.user_id);

create policy "appointment clients member read" on public.appointment_clients
  for select using (public.is_tenant_member(appointment_clients.tenant_id, array['member','admin','system_admin']::public.member_role[]));

create policy "appointment clients manage" on public.appointment_clients
  for all using (public.is_tenant_member(appointment_clients.tenant_id))
  with check (public.is_tenant_member(appointment_clients.tenant_id));

-- Availability policies (only admin/system)
create policy "appointment availability manage" on public.appointment_availability
  for all using (public.is_tenant_member(appointment_availability.tenant_id))
  with check (public.is_tenant_member(appointment_availability.tenant_id));

create policy "appointment availability read" on public.appointment_availability
  for select using (public.is_tenant_member(appointment_availability.tenant_id, array['member','admin','system_admin']::public.member_role[]));

-- Time off policies
create policy "appointment time off manage" on public.appointment_time_off
  for all using (public.is_tenant_member(appointment_time_off.tenant_id))
  with check (public.is_tenant_member(appointment_time_off.tenant_id));

create policy "appointment time off read" on public.appointment_time_off
  for select using (public.is_tenant_member(appointment_time_off.tenant_id, array['member','admin','system_admin']::public.member_role[]));

-- Appointments policies
create policy "appointment appointments client read" on public.appointment_appointments
  for select using (auth.uid() = public.appointment_appointments.created_by or auth.uid() = (select user_id from public.appointment_clients where id = public.appointment_appointments.client_id));

create policy "appointment appointments client insert" on public.appointment_appointments
  for insert with check (auth.uid() = public.appointment_appointments.created_by);

create policy "appointment appointments client update" on public.appointment_appointments
  for update using (auth.uid() = public.appointment_appointments.created_by)
  with check (auth.uid() = public.appointment_appointments.created_by);

create policy "appointment appointments member read" on public.appointment_appointments
  for select using (public.is_tenant_member(public.appointment_appointments.tenant_id, array['member','admin','system_admin']::public.member_role[]));

create policy "appointment appointments manage" on public.appointment_appointments
  for all using (public.is_tenant_member(public.appointment_appointments.tenant_id))
  with check (public.is_tenant_member(public.appointment_appointments.tenant_id));

-- Register appointments module (separate from invoice)
insert into public.modules (id, name, description, is_free)
values
  ('appointments', 'Appointments', 'Sistema de citas y agendamiento con control de disponibilidad.', false)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_free = excluded.is_free;
