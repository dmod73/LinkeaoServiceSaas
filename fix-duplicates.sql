-- Script para arreglar módulos duplicados
-- Este script elimina duplicados en tenant_modules manteniendo solo el más reciente

-- Paso 1: Ver los duplicados
SELECT 
    tenant_id, 
    module_id, 
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids
FROM tenant_modules
WHERE module_id = 'appointments'
GROUP BY tenant_id, module_id
HAVING COUNT(*) > 1;

-- Paso 2: Eliminar duplicados (mantiene el más reciente por tenant)
-- DESCOMENTA ESTAS LÍNEAS PARA EJECUTAR:
/*
DELETE FROM tenant_modules
WHERE id IN (
    SELECT unnest(ids[2:])  -- Elimina todos excepto el primero (más reciente)
    FROM (
        SELECT ARRAY_AGG(id ORDER BY created_at DESC) as ids
        FROM tenant_modules
        WHERE module_id = 'appointments'
        GROUP BY tenant_id, module_id
        HAVING COUNT(*) > 1
    ) sub
);
*/
