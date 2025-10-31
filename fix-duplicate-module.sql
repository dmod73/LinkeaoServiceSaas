-- Script para eliminar el módulo duplicado de Appointments
-- IMPORTANTE: Esto solo elimina el registro duplicado, NO borra datos

-- Primero, ver cuántos módulos de appointments hay
SELECT * FROM tenant_modules WHERE module_id = 'appointments';

-- Si hay duplicados, eliminar los que NO sean el correcto
-- (ejecuta esto solo después de verificar cuál es el duplicado)
-- DELETE FROM tenant_modules 
-- WHERE module_id = 'appointments' 
-- AND id = 'AQUI_EL_ID_DEL_DUPLICADO';
