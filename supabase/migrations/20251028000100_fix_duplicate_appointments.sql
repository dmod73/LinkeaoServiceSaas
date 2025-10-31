-- Migration: Fix duplicate Appointments modules
-- Created: 2025-10-28
-- Purpose: Consolidate appointments and invoice modules into a single 'appointments' module

-- CONTEXT:
-- - Legacy system had 'invoice' module with invoice_* tables
-- - New system created 'appointments' module with appointment_* tables  
-- - Both modules showed as "Appointments" causing duplicates in UI
-- - This migration consolidates everything under 'appointments'

-- ============================================
-- PASO 1: Ensure appointment_* tables exist
-- ============================================
-- (Tables should already exist from 20251028000000_appointments_module.sql)

-- ============================================
-- PASO 2: Migrate data from invoice_* tables to appointment_* tables (if they exist)
-- ============================================

DO $$
BEGIN
    -- Migrate invoice_services -> appointment_services (if invoice_services exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_services') THEN
        INSERT INTO appointment_services (id, tenant_id, name, description, duration_minutes, price, currency, is_active, created_at, updated_at)
        SELECT id, tenant_id, name, description, duration_minutes, price, currency, is_active, created_at, updated_at
        FROM invoice_services
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from invoice_services to appointment_services';
    ELSE
        RAISE NOTICE 'invoice_services table does not exist, skipping migration';
    END IF;

    -- Migrate invoice_clients -> appointment_clients (if invoice_clients exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_clients') THEN
        INSERT INTO appointment_clients (id, tenant_id, user_id, full_name, email, phone, created_at, updated_at)
        SELECT id, tenant_id, user_id, full_name, email, phone, created_at, updated_at
        FROM invoice_clients
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from invoice_clients to appointment_clients';
    ELSE
        RAISE NOTICE 'invoice_clients table does not exist, skipping migration';
    END IF;

    -- Migrate invoice_availability -> appointment_availability (if invoice_availability exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_availability') THEN
        INSERT INTO appointment_availability (id, tenant_id, weekday, start_time, end_time, created_at, updated_at)
        SELECT id, tenant_id, weekday, start_time, end_time, created_at, updated_at
        FROM invoice_availability
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from invoice_availability to appointment_availability';
    ELSE
        RAISE NOTICE 'invoice_availability table does not exist, skipping migration';
    END IF;

    -- Migrate invoice_time_off -> appointment_time_off (if invoice_time_off exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_time_off') THEN
        INSERT INTO appointment_time_off (id, tenant_id, starts_at, ends_at, reason, created_at, updated_at)
        SELECT id, tenant_id, starts_at, ends_at, reason, created_at, updated_at
        FROM invoice_time_off
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from invoice_time_off to appointment_time_off';
    ELSE
        RAISE NOTICE 'invoice_time_off table does not exist, skipping migration';
    END IF;

    -- Migrate invoice_appointments -> appointment_appointments (if invoice_appointments exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_appointments') THEN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_appointment_status') THEN
            INSERT INTO appointment_appointments (id, tenant_id, client_id, service_id, status, scheduled_start, scheduled_end, client_note, internal_note, created_by, created_at, updated_at)
            SELECT id, tenant_id, client_id, service_id, status::text::appointment_status, scheduled_start, scheduled_end, client_note, internal_note, created_by, created_at, updated_at
            FROM invoice_appointments
            ON CONFLICT (id) DO NOTHING;
            RAISE NOTICE 'Migrated data from invoice_appointments to appointment_appointments';
        END IF;
    ELSE
        RAISE NOTICE 'invoice_appointments table does not exist, skipping migration';
    END IF;
END $$;

-- ============================================
-- PASO 3: Clean up tenant_modules
-- ============================================

-- Migrate tenant_modules from 'invoice' to 'appointments'
INSERT INTO tenant_modules (tenant_id, module_id, enabled, settings, created_by, created_at, updated_at)
SELECT 
    tenant_id,
    'appointments' as module_id,
    enabled,
    settings,
    created_by,
    created_at,
    updated_at
FROM tenant_modules
WHERE module_id = 'invoice'
ON CONFLICT (tenant_id, module_id) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    settings = COALESCE(EXCLUDED.settings, tenant_modules.settings),
    updated_at = GREATEST(EXCLUDED.updated_at, tenant_modules.updated_at);

-- Remove old 'invoice' module references from tenant_modules
DELETE FROM tenant_modules WHERE module_id = 'invoice';

-- Remove duplicates in tenant_modules (keep most recent)
-- tenant_modules has PRIMARY KEY (tenant_id, module_id), so duplicates shouldn't exist
-- But if they do (from manual inserts), this will clean them up
DELETE FROM tenant_modules tm1
WHERE EXISTS (
    SELECT 1
    FROM tenant_modules tm2
    WHERE tm1.tenant_id = tm2.tenant_id
      AND tm1.module_id = tm2.module_id
      AND tm1.module_id = 'appointments'
      AND tm1.created_at < tm2.created_at
);

-- ============================================
-- PASO 4: Clean up modules catalog
-- ============================================

-- Ensure appointments module exists with correct details
INSERT INTO modules (id, name, description, is_free)
VALUES ('appointments', 'Appointments', 'Agenda inteligente con reservas, disponibilidad y reportes para tu negocio.', false)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_free = EXCLUDED.is_free;

-- Remove old 'invoice' module from catalog
DELETE FROM modules WHERE id = 'invoice';

-- ============================================
-- PASO 5: Drop old invoice_* tables (optional, commented for safety)
-- ============================================
-- Uncomment only after verifying data migration was successful
-- DROP TABLE IF EXISTS invoice_appointments CASCADE;
-- DROP TABLE IF EXISTS invoice_time_off CASCADE;
-- DROP TABLE IF EXISTS invoice_availability CASCADE;
-- DROP TABLE IF EXISTS invoice_clients CASCADE;
-- DROP TABLE IF EXISTS invoice_services CASCADE;
-- DROP TYPE IF EXISTS invoice_appointment_status CASCADE;

-- ============================================
-- PASO 6: Verification
-- ============================================
DO $$
DECLARE
    appointments_module_count integer;
    invoice_module_count integer;
    duplicate_tenant_modules integer;
BEGIN
    -- Check modules table
    SELECT COUNT(*) INTO appointments_module_count FROM modules WHERE id = 'appointments';
    SELECT COUNT(*) INTO invoice_module_count FROM modules WHERE id = 'invoice';
    
    IF appointments_module_count != 1 THEN
        RAISE EXCEPTION 'Error: Expected 1 appointments module, found %', appointments_module_count;
    END IF;
    
    IF invoice_module_count != 0 THEN
        RAISE WARNING 'Warning: Found % invoice module(s), should be 0', invoice_module_count;
    END IF;
    
    -- Check for duplicates in tenant_modules
    -- (Should be 0 because of PRIMARY KEY constraint)
    SELECT COUNT(*) INTO duplicate_tenant_modules
    FROM (
        SELECT tenant_id, module_id, COUNT(*) as cnt
        FROM tenant_modules
        WHERE module_id = 'appointments'
        GROUP BY tenant_id, module_id
        HAVING COUNT(*) > 1
    ) dups;
    
    IF duplicate_tenant_modules > 0 THEN
        RAISE EXCEPTION 'Error: Found % duplicate tenant_module entries for appointments', duplicate_tenant_modules;
    END IF;
    
    RAISE NOTICE '✓ Migration successful!';
    RAISE NOTICE '  - Appointments module: % (expected 1)', appointments_module_count;
    RAISE NOTICE '  - Invoice module: % (expected 0)', invoice_module_count;
    RAISE NOTICE '  - Duplicate tenant_modules: % (expected 0)', duplicate_tenant_modules;
END $$;
