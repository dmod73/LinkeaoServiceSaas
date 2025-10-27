alter table public.link_service_links
  add column if not exists kind text not null default 'url',
  add column if not exists payload jsonb not null default '[]'::jsonb;

alter table public.link_service_links
  drop constraint if exists link_service_links_kind_check;

alter table public.link_service_links
  add constraint link_service_links_kind_check
  check (kind in ('url','whatsapp','facebook','instagram','carousel','phone','map'));

update public.link_service_links
set kind = coalesce(nullif(icon, ''), 'url')
where kind is null or kind = '';

update public.link_service_links
set payload = '[]'::jsonb
where payload is null;
