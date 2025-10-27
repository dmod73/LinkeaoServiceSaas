-- Tenants
create table if not exists public.tenants (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Dominios por tenant
create table if not exists public.tenant_domains (
  id bigserial primary key,
  tenant_id text references public.tenants(id) on delete cascade,
  domain text unique not null,
  created_at timestamptz default now()
);

-- Perfiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role' and typnamespace = 'public'::regnamespace) then
    create type public.member_role as enum ('system_admin','admin','member');
  end if;
end
$$;

create table if not exists public.memberships (
  tenant_id text references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz default now(),
  primary key (tenant_id, user_id)
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- RLS
alter table public.tenants enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

-- Politicas base
create policy "profiles self read" on public.profiles
for select using (auth.uid() = user_id);

create policy "profiles self insert" on public.profiles
for insert with check (auth.uid() = user_id);

create policy "memberships read by same tenant" on public.memberships
for select using (
  exists(select 1 from public.memberships m2 where m2.user_id = auth.uid() and m2.tenant_id = memberships.tenant_id)
);

create policy "tenants read by member" on public.tenants
for select using (
  exists(select 1 from public.memberships m where m.user_id = auth.uid() and m.tenant_id = tenants.id)
);

create policy "tenant_domains read by member" on public.tenant_domains
for select using (
  exists(select 1 from public.memberships m where m.user_id = auth.uid() and m.tenant_id = tenant_domains.tenant_id)
);
