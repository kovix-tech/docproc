# docproc — Contexto para Claude Code

## Qué es esto

Plataforma modular de digitalización de documentos con IA (Claude Vision). Multi-tenant: los clientes configuran sus propios tipos de documento y campos a extraer.

**Repo:** `kovix-tech/docproc` — `/home/mrf/vesprini/docproc`
**Proyecto relacionado:** `poc-mrf` (POC original de Vesprini) en `/home/mrf/vesprini/poc-mrf`

---

## Estado actual

**Phase 1 COMPLETADA** — MVP API layer (ver `docs/plans/phase-1-mvp-api-COMPLETED.md`)

**Phase 2 PENDIENTE** — Admin UI + Review UI + Webhooks + Migración Vesprini (ver `docs/plans/phase-2-ui.md`)

---

## Arquitectura (ver `docs/architecture.md`)

Dos servicios NestJS:

```
services/registry/   → port 3001 — gestión de tenants/schemas/prompts
services/core/       → port 3002 — extracción AI + review workflow
packages/
  api-contracts/     → Zod schemas compartidos entre servicios
  typescript-config/ → tsconfig base + nestjs
```

### Registry (port 3001)
- Tenants: CRUD + generación de API key (`dp_...`, hash SHA-256 en DB)
- DocumentTypes: tipos de documento por tenant
- FieldSchemas: campos con tipo (text/number/date/enum/boolean), requerido/opcional, orden
- PromptBuilder: genera prompt dinámicamente desde FieldSchemas (o usa override manual)
- API interna: `/internal/schema/:id` y `/internal/tenant/by-api-key/:key` (para el core)

### Core (port 3002)
- Auth: `X-Api-Key: dp_...` en todos los endpoints (validado contra registry)
- `POST /v1/documents` — upload multipart, extracción async (fire-and-forget)
- `GET /v1/documents/:id` — resultado con campos extraídos
- `PATCH /v1/documents/:id/fields` — corrección de campos
- `POST /v1/documents/:id/confirm` / `/reject` — workflow de revisión

### Comunicación interna
- Core → Registry: `X-Internal-Secret` en header (mismo valor en ambos .env)
- Los servicios tienen DBs separadas (postgres-registry en 5433, postgres-core en 5434)

---

## Cómo arrancar

```bash
# Configurar env
cp services/registry/.env.example services/registry/.env
cp services/core/.env.example services/core/.env
# Editar: ANTHROPIC_API_KEY y INTERNAL_SECRET (mismo valor en ambos)

# Bases de datos
docker compose up -d postgres-registry postgres-core

# Instalar deps
pnpm install

# Servicios (terminales separadas)
cd services/registry && pnpm dev
cd services/core && pnpm dev
```

---

## Tests

```bash
cd services/registry && pnpm test   # 7 tests
cd services/core && pnpm test       # 4 tests
pnpm test                           # todos desde la raíz
```

---

## Gotchas importantes

1. **`outDir`/`baseUrl` en tsconfig**: deben estar en el `tsconfig.json` de cada servicio (no solo heredados). TypeScript resuelve estos paths relativos al archivo donde están definidos, no al consumidor.

2. **Sequelize `order` en asociaciones**: no usar `{ order: [...] }` en `@HasMany`. Hacerlo en la query: `order: [[FieldSchema, 'order', 'ASC']]`.

3. **`INTERNAL_SECRET`**: si no está en el `.env`, el core falla al arrancar (fail-fast intencional).

4. **`synchronize: true`**: ambos servicios crean las tablas automáticamente al arrancar (solo dev). Para producción hay que hacer migraciones formales.

5. **multer v2**: el core usa multer 2.x (1.x fue removido de npm).

6. **API key en URL**: `RegistryClient.resolveTenant` usa `encodeURIComponent` para evitar path traversal.

---

## Archivos clave por módulo

### Registry
```
src/
  tenants/          → TenantsService, TenantsController
  document-types/   → DocumentTypesService (CRUD + reorder)
  prompt/           → PromptBuilderService
  internal/         → InternalController, InternalAuthGuard
  database/models/  → Tenant, DocumentType, FieldSchema
```

### Core
```
src/
  documents/        → DocumentsService, DocumentsController
  extractor/        → ExtractorService (llama a Claude Vision)
  registry/         → RegistryClient (HTTP client al registry)
  auth/             → ApiKeyGuard, CurrentTenant decorator
  database/models/  → Document, ExtractionField
```

---

## Próximos pasos (Phase 2)

1. **Admin UI** — Next.js en registry para gestionar tenants y tipos de documento
2. **Review UI** — Página embebible en core para revisar/confirmar extracción (JWT one-time)
3. **Webhooks** — POST al webhookUrl del tenant en cambios de estado
4. **Migración Vesprini** — Configurar Vesprini como primer tenant en docproc
5. **CI/CD** — GitHub Actions: test + build en cada PR

Ver `docs/plans/phase-2-ui.md` para el detalle de cada task.
