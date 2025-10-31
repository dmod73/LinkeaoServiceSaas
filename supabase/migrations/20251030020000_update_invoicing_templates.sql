-- ============================================
-- UPDATE INVOICING TEMPLATES
-- Keep only 2 templates: minimal and professional
-- ============================================

-- Delete old templates that are no longer needed
DELETE FROM public.invoicing_templates 
WHERE id IN ('modern', 'classic', 'colorful');

-- Update minimal template
INSERT INTO public.invoicing_templates (id, name, description, preview_url, layout)
VALUES
  ('minimal', 'Minimalista', 'Diseño simple y elegante con fondo blanco', '/templates/minimal-preview.png',
   '{"style":"minimal","primaryColor":"#000000","secondaryColor":"#404040","fontFamily":"Helvetica","headerStyle":"simple","showLogo":false}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  preview_url = EXCLUDED.preview_url,
  layout = EXCLUDED.layout;

-- Update professional template  
INSERT INTO public.invoicing_templates (id, name, description, preview_url, layout)
VALUES
  ('professional', 'Profesional', 'Diseño corporativo y serio con azul oscuro', '/templates/professional-preview.png',
   '{"style":"professional","primaryColor":"#0f172a","secondaryColor":"#334155","fontFamily":"Arial","headerStyle":"corporate","showLogo":true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  preview_url = EXCLUDED.preview_url,
  layout = EXCLUDED.layout;

-- Update any tenant settings that were using deleted templates to use minimal instead
UPDATE public.invoicing_tenant_settings
SET selected_template_id = 'minimal'
WHERE selected_template_id IN ('modern', 'classic', 'colorful');
