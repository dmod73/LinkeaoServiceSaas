-- Add JSON columns for business_hours and breaks to invoice_settings

alter table public.invoice_settings
  add column if not exists business_hours jsonb default '[]'::jsonb;

alter table public.invoice_settings
  add column if not exists breaks jsonb default '[]'::jsonb;

-- Update updated_at trigger if present (skip if not)
