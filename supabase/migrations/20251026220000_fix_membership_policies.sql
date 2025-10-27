-- Ajuste de políticas para evitar recursión infinita en memberships

drop policy if exists "memberships read by same tenant" on public.memberships;

create policy "memberships self read" on public.memberships
for select using (
  auth.uid() = user_id
  or auth.jwt() ->> 'role' = 'service_role'
);

-- Funciones helper para políticas de módulos y tenantes
create or replace function public.user_has_tenant_role(target_tenant text, allowed_roles public.member_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.memberships
    where tenant_id = target_tenant
      and user_id = auth.uid()
      and (allowed_roles is null or role = any(allowed_roles))
  );
$$;

revoke all on function public.user_has_tenant_role(text, public.member_role[]) from public;
grant execute on function public.user_has_tenant_role(text, public.member_role[]) to authenticated;
grant execute on function public.user_has_tenant_role(text, public.member_role[]) to anon;

drop policy if exists "tenant modules read" on public.tenant_modules;
drop policy if exists "tenant modules upsert admin" on public.tenant_modules;
drop policy if exists "tenant modules update admin" on public.tenant_modules;
drop policy if exists "tenant modules delete system admin" on public.tenant_modules;

create policy "tenant modules read" on public.tenant_modules
for select using (
  public.user_has_tenant_role(tenant_modules.tenant_id, null)
);

create policy "tenant modules upsert admin" on public.tenant_modules
for insert with check (
  public.user_has_tenant_role(tenant_modules.tenant_id, array['admin','system_admin']::public.member_role[])
);

create policy "tenant modules update admin" on public.tenant_modules
for update using (
  public.user_has_tenant_role(tenant_modules.tenant_id, array['admin','system_admin']::public.member_role[])
)
with check (
  public.user_has_tenant_role(tenant_modules.tenant_id, array['admin','system_admin']::public.member_role[])
);

create policy "tenant modules delete system admin" on public.tenant_modules
for delete using (
  public.user_has_tenant_role(tenant_modules.tenant_id, array['system_admin']::public.member_role[])
);

drop policy if exists "tenants read by member" on public.tenants;

create policy "tenants read by member" on public.tenants
for select using (
  public.user_has_tenant_role(tenants.id, null)
);

drop policy if exists "tenant_domains read by member" on public.tenant_domains;

create policy "tenant_domains read by member" on public.tenant_domains
for select using (
  public.user_has_tenant_role(tenant_domains.tenant_id, null)
);
