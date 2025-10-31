# Módulo de Facturación - Sistema Completo

## ✅ Archivos Creados

### 1. Base de Datos

- `supabase/migrations/20251030000000_invoicing_module.sql` ✅
  - Tablas: clients, items, templates, tenant_settings, documents, payments
  - 5 plantillas pre-configuradas (Moderno, Clásico, Minimalista, Colorido, Profesional)
  - Row Level Security (RLS) configurado
  - Funciones para cálculos automáticos
  - Triggers para updated_at

### 2. TypeScript Types

- `apps/web/src/lib/features/invoicing/types.ts` ✅
- `apps/web/src/lib/features/invoicing/utils.ts` ✅
- `apps/web/src/lib/features/invoicing/dashboard.ts` ✅

### 3. API Routes

- `apps/web/app/api/invoicing/dashboard/route.ts` ✅
- `apps/web/app/api/invoicing/clients/route.ts` ✅
- `apps/web/app/api/invoicing/items/route.ts` ✅

## 📋 Archivos Pendientes

### API Routes Faltantes

1. `apps/web/app/api/invoicing/documents/route.ts` - CRUD de facturas y estimados
2. `apps/web/app/api/invoicing/payments/route.ts` - Registro de pagos
3. `apps/web/app/api/invoicing/settings/route.ts` - Configuración del tenant
4. `apps/web/app/api/invoicing/reports/route.ts` - Reportes con filtros
5. `apps/web/app/api/invoicing/pdf/route.ts` - Generación de PDF

### Frontend Components

1. `apps/web/app/(dashboard)/dashboard/invoicing/page.tsx` - Página principal
2. `apps/web/app/(dashboard)/dashboard/invoicing/Client.tsx` - Cliente principal con tabs
3. `apps/web/app/(dashboard)/dashboard/invoicing/invoicing.module.css` - Estilos

### Modales (dentro de Client.tsx)

1. CreateClientModal - Crear/editar clientes
2. CreateItemModal - Crear/editar artículos
3. CreateDocumentModal - Crear facturas/estimados (multi-step wizard)
4. RecordPaymentModal - Registrar pagos
5. SettingsModal - Configuración de empresa y plantillas

### Componentes de UI

1. InvoiceCard - Tarjeta de factura/estimado
2. ClientCard - Tarjeta de cliente
3. ItemCard - Tarjeta de artículo
4. StatsCard - Tarjetas de estadísticas
5. ReportFilters - Filtros de reportes
6. PDFPreview - Vista previa de PDF

## 🎨 Funcionalidades Implementadas en DB

### Clientes

- Tipos: Individual o Empresa
- Datos completos: nombre, email, teléfono, dirección
- Tax ID / RFC
- Notas y etiquetas

### Artículos/Servicios

- Tipos: Producto o Servicio
- SKU, descripción
- Precio unitario
- Tasa de impuesto configurable
- Control de inventario (opcional)

### Documentos (Facturas/Estimados)

- Numeración automática con prefijo configurable
- Estados: draft, sent, viewed, paid, partial, overdue, cancelled, accepted, declined
- Line items con cantidad, precio, impuesto individual
- Descuento global (porcentaje o fijo)
- Cálculo automático de totales
- Snapshot del cliente en el momento de creación
- Campos personalizados (JSON)
- Tracking de envío, visualización y pago

### Pagos

- Registro de pagos parciales o completos
- Métodos de pago
- Referencias
- Histórico completo

### Plantillas

- 5 plantillas pre-diseñadas
- Configuración de colores, fuentes, estilos
- Selección por tenant

### Configuración del Tenant

- Información de la empresa
- Logo, dirección, datos de contacto
- Prefijos de numeración
- Contador automático
- Términos de pago por defecto
- Tasa de impuesto por defecto

## 📊 Estructura de Tabs del Dashboard

1. **Resumen** - KPIs y gráficos
   - Total de facturas/estimados
   - Revenue total
   - Pendiente de pago
   - Vencido
   - Últimas facturas/estimados

2. **Facturas** - Lista de facturas
   - Crear nueva factura
   - Filtrar por estado, cliente, fecha
   - Acciones: ver, editar, enviar, registrar pago, descargar PDF

3. **Estimados** - Lista de estimados
   - Crear nuevo estimado
   - Convertir a factura
   - Acciones: ver, editar, enviar, descargar PDF

4. **Clientes** - Gestión de clientes
   - Crear/editar/eliminar clientes
   - Ver historial de facturas por cliente

5. **Artículos** - Catálogo de productos/servicios
   - Crear/editar/archivar artículos
   - Control de precios e impuestos

6. **Reportes** - Reportes avanzados
   - Filtros por: fecha, cliente, estado, monto
   - Exportar a CSV/Excel
   - Gráficos de revenue, clientes top, etc.

7. **Configuración** - Settings
   - Información de la empresa
   - Selección de plantilla
   - Configuración de numeración
   - Términos y notas por defecto

## 🎯 Características Clave

### Sistema de Descuentos

- Descuento por línea individual
- Descuento global (porcentaje o monto fijo)
- Cálculo automático

### Sistema de Impuestos

- Tax rate por artículo
- Tax rate por defecto del tenant
- Cálculo después de descuentos

### Generación de PDF

- 5 plantillas profesionales
- Personalización de colores y fuentes
- Logo de empresa
- Información completa del cliente
- Detalle de line items
- Subtotales, descuentos, impuestos, total
- Términos de pago
- Notas públicas y privadas

### Reportes Avanzados

Filtros disponibles:

- Rango de fechas
- Cliente específico
- Estados múltiples
- Tipo de documento (factura/estimado)
- Rango de montos
- Búsqueda de texto

## 🔧 Utilidades Implementadas

En `utils.ts`:

- `calculateDocumentTotal()` - Cálculos completos
- `formatCurrency()` - Formato de moneda
- `formatDate()` - Formato de fechas
- `getStatusColor()` - Colores por estado
- `getStatusLabel()` - Etiquetas en español
- `isOverdue()` - Detectar vencidos
- `generateDocumentNumber()` - Numeración automática
- `calculateBalanceDue()` - Balance pendiente
- Y más...

## 🚀 Próximos Pasos

Para completar el módulo, necesitas:

1. Crear las rutas API faltantes (documents, payments, settings, reports, pdf)
2. Crear el componente Client.tsx con todos los tabs y modales
3. Crear el archivo CSS con estilos responsivos
4. Implementar la generación de PDF con las plantillas
5. Configurar el sistema de reportes con filtros
6. Agregar el módulo al menú principal del dashboard

## 💡 Notas Importantes

- El módulo usa el sistema de tenancy existente
- Compatible con el sistema de módulos (tenant_modules)
- Row Level Security configurado para multi-tenancy
- Todos los cálculos se hacen en el backend
- Snapshots del cliente preservan datos históricos
- Sistema de numeración automática con contadores
- Soft delete para artículos (is_active)

## 🔗 Integración con el Sistema

Para habilitar el módulo en un tenant:

```sql
INSERT INTO tenant_modules (tenant_id, module_id, enabled)
VALUES ('tu-tenant-id', 'invoicing', true);
```

El módulo está registrado como módulo de pago (is_free = false) en la tabla modules.
