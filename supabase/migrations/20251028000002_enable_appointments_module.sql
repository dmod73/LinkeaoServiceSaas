-- Enable appointments module for all tenants that had invoice module enabled
-- This migration ensures smooth transition from invoice to appointments module

-- Enable appointments module for tenants that have invoice enabled
insert into public.tenant_modules (tenant_id, module_id, enabled)
select 
  tenant_id, 
  'appointments' as module_id, 
  true as enabled
from public.tenant_modules
where module_id = 'invoice' and enabled = true
on conflict (tenant_id, module_id) do update
  set enabled = true;

-- Also enable appointments for any existing tenants who don't have it yet
insert into public.tenant_modules (tenant_id, module_id, enabled)
select 
  t.id as tenant_id,
  'appointments' as module_id,
  true as enabled
from public.tenants t
where not exists (
  select 1 from public.tenant_modules tm
  where tm.tenant_id = t.id and tm.module_id = 'appointments'
)
on conflict (tenant_id, module_id) do nothing;
