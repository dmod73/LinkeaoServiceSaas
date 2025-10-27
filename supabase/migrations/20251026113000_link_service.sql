-- LinkService profiles table
create table if not exists public.link_service_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.tenants(id) on delete cascade,
  handle text not null,
  title text not null,
  subtitle text,
  avatar_url text,
  social jsonb default '{}'::jsonb,
  theme jsonb default '{"background":"#0f172a","accent":"#6366f1","textColor":"#f8fafc","buttonShape":"pill"}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists link_service_profiles_tenant_handle_idx on public.link_service_profiles(tenant_id, handle);

-- Links table
create table if not exists public.link_service_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.link_service_profiles(id) on delete cascade,
  label text not null,
  url text not null,
  description text,
  icon text,
  position integer not null default 0,
  is_active boolean not null default true,
  highlight boolean not null default false,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists link_service_links_profile_position_idx on public.link_service_links(profile_id, position);

alter table public.link_service_profiles enable row level security;
alter table public.link_service_links enable row level security;

create policy "link profiles readable" on public.link_service_profiles
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = link_service_profiles.tenant_id
    )
  );

create policy "link profiles insert system admin" on public.link_service_profiles
  for insert with check (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = link_service_profiles.tenant_id
        and m.role = 'system_admin'
    )
  );

create policy "link profiles update admin" on public.link_service_profiles
  for update using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = link_service_profiles.tenant_id
        and m.role in ('admin','system_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = link_service_profiles.tenant_id
        and m.role in ('admin','system_admin')
    )
  );

create policy "link profiles delete system admin" on public.link_service_profiles
  for delete using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = link_service_profiles.tenant_id
        and m.role = 'system_admin'
    )
  );

create policy "links readable" on public.link_service_links
  for select using (
    exists (
      select 1
      from public.link_service_profiles p
      join public.memberships m on m.tenant_id = p.tenant_id
      where p.id = link_service_links.profile_id
        and m.user_id = auth.uid()
    )
  );

create policy "links insert admin" on public.link_service_links
  for insert with check (
    exists (
      select 1
      from public.link_service_profiles p
      join public.memberships m on m.tenant_id = p.tenant_id
      where p.id = link_service_links.profile_id
        and m.user_id = auth.uid()
        and m.role in ('admin','system_admin')
    )
  );

create policy "links update admin" on public.link_service_links
  for update using (
    exists (
      select 1
      from public.link_service_profiles p
      join public.memberships m on m.tenant_id = p.tenant_id
      where p.id = link_service_links.profile_id
        and m.user_id = auth.uid()
        and m.role in ('admin','system_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.link_service_profiles p
      join public.memberships m on m.tenant_id = p.tenant_id
      where p.id = link_service_links.profile_id
        and m.user_id = auth.uid()
        and m.role in ('admin','system_admin')
    )
  );

create policy "links delete system admin" on public.link_service_links
  for delete using (
    exists (
      select 1
      from public.link_service_profiles p
      join public.memberships m on m.tenant_id = p.tenant_id
      where p.id = link_service_links.profile_id
        and m.user_id = auth.uid()
        and m.role = 'system_admin'
    )
  );
