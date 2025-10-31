-- Enable Invoicing Module for all tenants
-- This migration adds the invoicing module to all existing tenants

-- Insert invoicing module into tenant_modules for all tenants
INSERT INTO tenant_modules (tenant_id, module_id, enabled)
SELECT 
  t.id as tenant_id,
  'invoicing' as module_id,
  true as enabled
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_modules tm 
  WHERE tm.tenant_id = t.id AND tm.module_id = 'invoicing'
)
ON CONFLICT (tenant_id, module_id) DO UPDATE
  SET enabled = true;

-- Add comment for documentation
COMMENT ON TABLE invoicing_clients IS 'Stores client information for invoicing module';
COMMENT ON TABLE invoicing_items IS 'Stores products and services catalog for invoicing';
COMMENT ON TABLE invoicing_templates IS 'Pre-configured invoice templates (modern, classic, minimal, colorful, professional)';
COMMENT ON TABLE invoicing_tenant_settings IS 'Tenant-specific invoicing settings and preferences';
COMMENT ON TABLE invoicing_documents IS 'Stores invoices and estimates with line items';
COMMENT ON TABLE invoicing_payments IS 'Tracks payments made against invoices';
