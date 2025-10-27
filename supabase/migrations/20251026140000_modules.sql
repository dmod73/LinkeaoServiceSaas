create table if not exists public.modules (
  id text primary key,
  name text not null,
  description text,
  is_free boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.tenant_modules (
  tenant_id text not null references public.tenants(id) on delete cascade,
  module_id text not null references public.modules(id) on delete cascade,
  enabled boolean not null default true,
  settings jsonb default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (tenant_id, module_id)
);

alter table public.modules enable row level security;
alter table public.tenant_modules enable row level security;

create policy "modules read" on public.modules
  for select using (true);

create policy "tenant modules read" on public.tenant_modules
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = tenant_modules.tenant_id
    )
  );

create policy "tenant modules upsert admin" on public.tenant_modules
  for insert with check (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = tenant_modules.tenant_id
        and m.role in ('admin','system_admin')
    )
  );

create policy "tenant modules update admin" on public.tenant_modules
  for update using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = tenant_modules.tenant_id
        and m.role in ('admin','system_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = tenant_modules.tenant_id
        and m.role in ('admin','system_admin')
    )
  );

create policy "tenant modules delete system admin" on public.tenant_modules
  for delete using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = tenant_modules.tenant_id
        and m.role = 'system_admin'
    )
  );

insert into public.modules (id, name, description, is_free)
values
  ('linkservice', 'LinkService', 'Crea paginas de enlaces tipo Linktree para tu negocio.', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_free = excluded.is_free;

