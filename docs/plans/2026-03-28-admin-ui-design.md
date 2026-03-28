# Admin UI Design — docproc Phase 2, Task 1

**Fecha:** 2026-03-28
**Estado:** Aprobado

---

## Contexto

Agregar una Admin UI embebida en el servicio `registry` para gestionar tenants y tipos de documento sin necesidad de curl.

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Ubicación | Embebida en registry | Un solo proceso/deploy |
| Rendering | Static export (`output: 'export'`) | Sin SSR necesario para admin |
| Auth | Basic auth (usuario/contraseña en .env) | Suficiente para MVP interno |
| Rutas dinámicas | Query params (`/detail?id=xxx`) | Evita `generateStaticParams` con IDs desconocidos |
| Stack | Next.js 15 + Tailwind 4 + shadcn/ui + @dnd-kit/core | Mismo que poc-mrf |

---

## Estructura de archivos

```
services/registry/
  admin/                         ← Next.js 15 app (package.json propio)
    src/app/
      layout.tsx                 ← shell, Tailwind, shadcn
      page.tsx                   ← redirect a /tenants
      tenants/
        page.tsx                 ← lista de tenants + botón Nuevo
        new/page.tsx             ← form crear tenant → muestra API key una vez
        detail/page.tsx          ← ?id=xxx → detalle + lista doc types
      document-types/
        new/page.tsx             ← ?tenantId=xxx → form crear doc type
        detail/page.tsx          ← ?id=xxx → editor de campos + preview prompt
        test/page.tsx            ← ?id=xxx → upload prueba → resultado extracción
    next.config.ts               ← output: 'export', basePath: '/admin'
    package.json
    tsconfig.json
    tailwind.config.ts
    components.json              ← shadcn config
  src/
    admin/
      basic-auth.middleware.ts   ← valida Authorization header vs ADMIN_USER/ADMIN_PASSWORD
      admin.module.ts            ← registra ServeStaticModule + middleware
```

---

## Integración NestJS

### ServeStaticModule

```typescript
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', '..', 'admin', 'out'),
  serveRoot: '/admin',
  exclude: ['/tenants*', '/document-types*', '/internal*'],
})
```

### BasicAuthMiddleware

- Aplicado a `/admin/**`
- Lee `ADMIN_USER` y `ADMIN_PASSWORD` del `.env`
- Responde `401 + WWW-Authenticate: Basic` si falta o es inválida
- El browser cachea las credenciales y muestra diálogo nativo

### Variables de entorno nuevas

```env
ADMIN_USER=admin
ADMIN_PASSWORD=changeme
```

---

## API endpoints necesarios

Los endpoints de la registry API son llamados desde el browser (client-side fetch). No tienen auth propia — quedan protegidos por red interna (aceptable para MVP).

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/tenants` | Listar todos |
| POST | `/tenants` | Crear (respuesta incluye API key, mostrar una sola vez) |
| GET | `/tenants/:id` | Detalle del tenant |
| GET | `/document-types?tenantId=` | Listar por tenant |
| POST | `/document-types` | Crear doc type |
| GET | `/document-types/:id` | Detalle con campos |
| POST | `/document-types/:id/fields` | Agregar campo |
| PATCH | `/document-types/:id/fields/:fid` | Editar campo |
| DELETE | `/document-types/:id/fields/:fid` | Borrar campo |
| PATCH | `/document-types/:id/fields/reorder` | Reordenar campos |
| GET | `/document-types/:id/prompt-preview` | Preview del prompt generado |
| PATCH | `/document-types/:id/prompt-override` | Override manual del prompt |

---

## Páginas

### `/admin/tenants`
- Tabla con nombre, fecha creación, cantidad de doc types
- Botón "Nuevo Tenant"
- Click en fila → `/admin/tenants/detail?id=xxx`

### `/admin/tenants/new`
- Form: nombre (requerido) + webhookUrl (opcional)
- Submit → muestra la API key generada **una sola vez** en un modal/alert con botón copiar
- Redirige a `/admin/tenants/detail?id=xxx`

### `/admin/tenants/detail?id=xxx`
- Nombre del tenant + webhookUrl
- Lista de tipos de documento (tabla)
- Botón "Nuevo Tipo de Documento"

### `/admin/document-types/new?tenantId=xxx`
- Form: nombre + descripción + modelo AI (select)
- Submit → redirige a `/admin/document-types/detail?id=xxx`

### `/admin/document-types/detail?id=xxx`
- Nombre + descripción del tipo
- Lista de campos con drag-and-drop para reordenar (`@dnd-kit/core`)
- Cada campo: key, label, tipo, descripción, required, opciones enum (si tipo=enum)
- Botón "Agregar Campo" → form inline o modal
- Preview del prompt auto-generado (read-only, se actualiza al cambiar campos)
- Toggle "Override manual" → textarea con el prompt custom
- Link a página de test

### `/admin/document-types/test?id=xxx`
- Upload de imagen/PDF
- Llama al core (`POST /v1/documents`) usando una API key de test (configurada en .env)
- Muestra resultado de extracción con los campos y valores

---

## Dev workflow

```bash
# Desarrollo
cd services/registry && pnpm dev          # NestJS en :3001
cd services/registry/admin && pnpm dev    # Next.js en :3000 (hot reload)

# Producción / ver integrado
cd services/registry/admin && pnpm build  # genera admin/out/
cd services/registry && pnpm start        # NestJS sirve admin/out/ en /admin
```

### Scripts en `services/registry/package.json`

```json
"build:admin": "cd admin && pnpm build",
"build:all": "pnpm build:admin && pnpm build"
```

---

## Notas

- La página de test del doc type necesita una API key del core — agregar `TEST_API_KEY` al `.env` del registry (o configurarla en el admin mismo).
- La Review UI (Task 2) es independiente y va en el servicio `core`.
- Los endpoints de la registry API no exponen CORS por ahora (el admin fetch es same-origin en producción).
