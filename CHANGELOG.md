# Changelog Módulo Appointments

## [0.2.0] - 2025-10-28

### Changed

- Renombrado feature 'invoice' a 'appointments' por claridad semántica
- Creado alias para mantener compatibilidad hacia atrás:
  - Nueva carpeta `features/appointments/` que re-exporta de `features/invoice/`
  - Nueva ruta `/appointments` que usa los mismos componentes de `/invoice`
  - Nueva ruta API `/api/appointments/*` que delega a `/api/invoice/*`
  - Nuevo tipo `AppointmentService` etc. (alias de `InvoiceService`)
  - Módulo listado como "appointments" en catalog (manteniendo "invoice")

### Pendiente

- [ ] Migrar tablas/DB de `invoice_*` a `appointment_*` (requiere PR separado)
- [ ] Renombrar migraciones/tablas una vez validado el cambio de código
- [ ] Deprecar y remover rutas `invoice` en próxima versión major

## Breaking Changes

- Los imports desde `@/lib/features/invoice/*` deberían cambiarse a `@/lib/features/appointments/*`
- Las rutas `/api/invoice/*` se mantienen por compatibilidad pero serán deprecadas

## Migration Guide

1. Actualizar imports en código nuevo para usar `appointments/` en lugar de `invoice/`
2. Las rutas existentes seguirán funcionando por compatibilidad
3. En próxima versión major, las rutas `invoice` serán removidas
