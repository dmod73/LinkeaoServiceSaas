-- Script para diagnosticar el problema de módulos duplicados

-- 1. Ver si hay duplicados en la tabla 'modules' (catálogo global)
SELECT 
    id, 
    name, 
    description,
    COUNT(*) OVER (PARTITION BY id) as duplicate_count
FROM modules
WHERE id = 'appointments'
ORDER BY id;

-- 2. Ver si hay duplicados en 'tenant_modules' (por tenant)
SELECT 
    id,
    tenant_id, 
    module_id,
    enabled,
    created_at,
    COUNT(*) OVER (PARTITION BY tenant_id, module_id) as duplicate_count
FROM tenant_modules
WHERE module_id = 'appointments'
ORDER BY tenant_id, created_at DESC;

-- 3. Ver TODOS los módulos en el catálogo
SELECT * FROM modules ORDER BY name;
