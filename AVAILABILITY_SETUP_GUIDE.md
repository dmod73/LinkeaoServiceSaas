# Guía para Configurar Disponibilidad de Appointments

## Problema

Los horarios no aparecen en la página de booking porque no hay disponibilidad configurada.

## Solución 1: Configurar desde el Dashboard (Recomendado)

### Paso 1: Ir al Dashboard de Appointments

1. Navega a: `http://localhost:3000/dashboard/appointments`
2. Deberías ver opciones para configurar:
   - Servicios
   - Disponibilidad
   - Citas

### Paso 2: Configurar Horarios de Disponibilidad

1. Busca la sección "Disponibilidad" o "Horarios"
2. Configura tus horarios laborales por día:
   - **Lunes a Viernes**: 9:00 AM - 6:00 PM
   - **Sábado**: 10:00 AM - 2:00 PM
   - **Domingo**: Cerrado

### Paso 3: Configurar Servicios

1. Ve a la sección "Servicios"
2. Verifica que el servicio "Corte" esté activo:
   - Nombre: Corte
   - Duración: 60 minutos
   - Precio: 30 USD
   - Estado: Activo ✅

### Paso 4: Verificar

1. Vuelve a la página de booking: `http://localhost:3000/invoice`
2. Selecciona una fecha (29 oct)
3. Los horarios deberían aparecer ahora

---

## Solución 2: Configurar manualmente en Supabase

Si no puedes acceder al dashboard, usa SQL directamente:

### Paso 1: Obtener tu Tenant ID

```sql
-- En Supabase SQL Editor
SELECT id, name FROM tenants WHERE name LIKE '%tu_nombre%';
```

### Paso 2: Insertar Disponibilidad

```sql
-- Reemplaza 'TU_TENANT_ID' con el ID obtenido arriba
INSERT INTO appointments_availability (tenant_id, weekday, start_time, end_time)
VALUES
  ('TU_TENANT_ID', 0, '09:00', '18:00'),  -- Lunes
  ('TU_TENANT_ID', 1, '09:00', '18:00'),  -- Martes
  ('TU_TENANT_ID', 2, '09:00', '18:00'),  -- Miércoles
  ('TU_TENANT_ID', 3, '09:00', '18:00'),  -- Jueves
  ('TU_TENANT_ID', 4, '09:00', '18:00'),  -- Viernes
  ('TU_TENANT_ID', 5, '10:00', '14:00')   -- Sábado
ON CONFLICT DO NOTHING;
```

### Paso 3: Verificar Servicio Activo

```sql
SELECT * FROM appointments_services
WHERE tenant_id = 'TU_TENANT_ID'
  AND is_active = true;
```

Si no hay servicios activos:

```sql
UPDATE appointments_services
SET is_active = true
WHERE tenant_id = 'TU_TENANT_ID';
```

---

## Debugging (con Console Logs)

Recarga la página `http://localhost:3000/invoice` y abre la consola del navegador (F12).

Deberías ver logs como:

```
[AVAILABILITY API] {
  url: "/api/invoice/availability",
  availability: [...],  // <-- Si está vacío [], NO hay disponibilidad configurada
  timeOff: []
}

[SLOTS DEBUG] {
  selectedDate: "2025-10-29...",
  dayAvailability: {...}  // <-- Si es undefined, NO hay disponibilidad para ese día
}

[SLOTS RESULT] {
  slotsCount: 9,  // <-- Número de horarios generados
  slots: ["09:00", "10:00", ...]
}
```

### Si `availability` está vacío:

→ No has configurado disponibilidad. Usa Solución 1 o 2 arriba.

### Si `dayAvailability` es undefined:

→ El día seleccionado (martes 29 oct = weekday 1) no tiene horarios configurados.

### Si `slotsCount` es 0:

→ Los horarios están ocupados o hay time-off configurado.

---

## Nota sobre Weekdays

Los días de la semana se numeran así:

- 0 = Lunes
- 1 = Martes
- 2 = Miércoles
- 3 = Jueves
- 4 = Viernes
- 5 = Sábado
- 6 = Domingo

El 29 de octubre de 2025 es **Miércoles** (weekday = 2).

Asegúrate de tener disponibilidad para weekday = 2.
