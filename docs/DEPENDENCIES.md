# Dependencias Del Monorepo

Inventario actualizado de dependencias para facilitar auditorías, upgrades y seguridad.

## Herramientas Base
- `node` v22 (configurado mediante `.nvmrc` y `.node-version`)
- `pnpm` 9.12.0 (workspace root)
- `turbo` ^2.1.0 (orquestación de pipelines)
- `supabase` CLI ^2.53.6 (migraciones y administración)
- `ngrok` 5.0.0-beta.2 (túneles locales)

## apps/web – Dependencias Runtime
- `next` 16.0.0
- `react` 19.2.0
- `react-dom` 19.2.0
- `swr` ^2.3.6
- `lucide-react` 0.453.0
- `@supabase/supabase-js` ^2.76.1
- `@supabase/ssr` ^0.7.0
- `@core/shared`, `@sdk/client`, `@ui/shared` (workspaces locales)

### apps/web – Dependencias de Desarrollo
- `typescript` ~5.9.0
- `@types/node` ^22.0.0
- `@types/react` ^19.0.0
- `autoprefixer` ^10.4.20
- `postcss` ^8.4.47
- `tailwindcss` ^3.4.13
- `eslint` ^9.14.0
- `prettier` ^3.3.3

## Paquetes Compartidos
- `@core/shared`: `typescript` ~5.9.0
- `@sdk/client`: `@core/shared`, `typescript` ~5.9.0
- `@ui/shared`: `typescript` ~5.9.0, `eslint` ^9.14.0, `prettier` ^3.3.3, `@types/react` ^19.0.0, `@types/react-dom` ^19.0.0 (peer deps: `react`, `react-dom` >=18)

## Notas
- Mantener sincronizada esta lista con cada actualización de `package.json` o incorporación de nuevos workspaces.
- Documentar upgrades mayores (major) en el CHANGELOG o en notas de release.
