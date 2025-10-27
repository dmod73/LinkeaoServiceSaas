alter table if exists public.link_service_links
  add column if not exists thumbnail_url text;
