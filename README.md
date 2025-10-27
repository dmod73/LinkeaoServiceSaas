# Micro-SaaS Monorepo

## Estructura
- `apps/web`: Next 16, React 19, TS 5.9, Tailwind, Supabase SSR
- `packages/ui`: componentes compartidos (shadcn ready)
- `packages/core`: utilidades core (roles, tenancy, helpers)
- `packages/sdk`: cliente compartido para consumir servicios
- `packages/config`: tsconfig/eslint/prettier compartidos
- `supabase/migrations`: esquema multi-tenant, políticas RLS y módulos

## Primeros pasos
1. Instala las herramientas base  
   ```bash
   corepack enable pnpm@9.12.0
   pnpm install --global supabase@latest
   ```
2. Instala dependencias del monorepo: `./pnpm.cmd install`
3. Configura Supabase (local o project remoto):
   - Clona `.env.local` desde `apps/web/.env.example`
   - Define `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Opcional: `PLATFORM_ADMIN_EMAILS` para super admins
4. Sincroniza migraciones:
   ```bash
   ./supabase.cmd db reset --linked=false --db-url "<postgres-url>"
   ```
   o usa `./supabase.cmd db push` contra el proyecto enlazado.
5. Arranca la app: `./pnpm.cmd --filter @apps/web dev`

> Consulta `docs/DEPENDENCIES.md` para revisar las versiones actuales antes de actualizar paquetes.

## Flujo de ramas y releases
- `main`: rama inmutable de producción. Cada despliegue pinna un tag semántico (`vX.Y.Z`).
- `dev`: rama de integración. Todo el trabajo cotidiano vive aquí; se crean tags solo después de merge a `main`.
- Crea ramas feature desde `dev`, abre PR -> `dev`, y prepara PR final `dev -> main` para releases.
- Pipeline sugerido:
  1. Merge de feature a `dev`.
  2. Ejecutar migraciones (`./supabase.cmd db push`).
  3. Actualizar CHANGELOG/Notas.
  4. Merge `dev` → `main`.
  5. Crear tag `vX.Y.Z` sobre `main`: `git tag -a vX.Y.Z -m "Descripción"` y `git push origin main --tags`.

## Migraciones y datos
- Todas las migraciones viven en `supabase/migrations`.
- Mantén sincronizados los entornos ejecutando `./supabase.cmd db push` tras cada cambio.
- Para un reset local rápido: `./supabase.cmd db reset --linked=false --db-url "<postgres-local>"`.
- Nunca borres migraciones aplicadas; si necesitas revertir, genera una migración nueva que “deshaga” el cambio.

## Vercel
- Node runtime 22
- Wildcard domain (`*.tu-dominio.com`) + dominios personalizados por tenant
- Configura variables de entorno en Vercel (nunca subas claves sensibles al repositorio)

## Seguridad
- RLS habilitado (revisa migraciones para políticas activas)
- Roles soportados: `system_admin` (plataforma), `admin` (dueño tenant), `member` (equipo)
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en handlers server-side; nunca exponer en el cliente

## Referencias rápidas
- Inventario de dependencias: [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md)
- Scripts comunes:
  - `./pnpm.cmd --filter @apps/web dev` – entorno local
  - `./pnpm.cmd run build` – build completo via Turborepo
  - `./pnpm.cmd run typecheck` – chequeo TS en todos los paquetes

