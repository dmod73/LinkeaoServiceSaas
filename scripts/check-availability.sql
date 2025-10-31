-- Script para verificar y crear disponibilidad de ejemplo
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar tenants existentes
SELECT id, name FROM tenants LIMIT 5;

-- 2. Verificar disponibilidad existente (reemplaza 'TU_TENANT_ID' con tu tenant ID)
SELECT * FROM appointments_availability WHERE tenant_id = 'TU_TENANT_ID';

-- 3. Verificar servicios existentes
SELECT * FROM appointments_services WHERE tenant_id = 'TU_TENANT_ID';

-- 4. CREAR DISPONIBILIDAD DE EJEMPLO (lunes a viernes, 9am-6pm)
-- Reemplaza 'TU_TENANT_ID' con el ID de tu tenant
INSERT INTO appointments_availability (tenant_id, weekday, start_time, end_time)
VALUES
  ('TU_TENANT_ID', 0, '09:00', '18:00'),  -- Lunes
  ('TU_TENANT_ID', 1, '09:00', '18:00'),  -- Martes
  ('TU_TENANT_ID', 2, '09:00', '18:00'),  -- Miércoles
  ('TU_TENANT_ID', 3, '09:00', '18:00'),  -- Jueves
  ('TU_TENANT_ID', 4, '09:00', '18:00'),  -- Viernes
  ('TU_TENANT_ID', 5, '10:00', '14:00')   -- Sábado
ON CONFLICT (id) DO NOTHING;

-- 5. Verificar que se creó correctamente
SELECT * FROM appointments_availability WHERE tenant_id = 'TU_TENANT_ID' ORDER BY weekday;
