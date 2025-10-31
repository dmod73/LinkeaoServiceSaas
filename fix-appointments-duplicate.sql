-- PASO 1: Ver si hay duplicados en tenant_modules
SELECT 
    id,
    tenant_id, 
    module_id,
    enabled,
    created_at,
    updated_at,
    COUNT(*) OVER (PARTITION BY tenant_id, module_id) as duplicate_count
FROM tenant_modules
WHERE module_id = 'appointments'
ORDER BY tenant_id, created_at DESC;

-- PASO 2: Si hay duplicados, esta query los elimina (mantiene solo el más reciente por tenant)
-- Ejecuta esto DESPUÉS de verificar que hay duplicados arriba
DELETE FROM tenant_modules
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY tenant_id, module_id 
                ORDER BY created_at DESC
            ) as rn
        FROM tenant_modules
        WHERE module_id = 'appointments'
    ) sub
    WHERE rn > 1  -- Elimina todos excepto el más reciente
);

-- PASO 3: Verificar que ya no hay duplicados
SELECT 
    tenant_id, 
    module_id,
    COUNT(*) as count
FROM tenant_modules
WHERE module_id = 'appointments'
GROUP BY tenant_id, module_id
HAVING COUNT(*) > 1;  -- Debería retornar 0 filas si está arreglado
