drop policy if exists "link profiles insert system admin" on public.link_service_profiles;

create policy "link profiles insert admin" on public.link_service_profiles
for insert with check (
  public.user_has_tenant_role(link_service_profiles.tenant_id, array['admin','system_admin']::public.member_role[])
);
