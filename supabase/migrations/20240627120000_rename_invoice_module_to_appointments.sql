-- Migration: Rename Invoice module to Appointments (display name only, keep module_id for compatibility)
-- This migration updates the display name and description for the 'invoice' module to 'Appointments'.

-- modules table uses `id` and `name` columns; update by id
update modules set name = 'Appointments', description = 'Gestión de agenda, citas y servicios' where id = 'invoice';

-- Optionally update any tenant_modules settings or stored display_name (if applicable)
-- Note: tenant_modules references modules.id as module_id, so this is a no-op unless you store display_name per-tenant
-- update tenant_modules set /* display_name = 'Appointments' */ where module_id = 'invoice';

-- If you have a module_catalog or similar, update there as well
-- update module_catalog set display_name = 'Appointments' where module_id = 'invoice';

-- No changes to module_id or API routes for backwards compatibility
