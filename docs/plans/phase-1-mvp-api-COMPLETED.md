# docproc — Phase 1: MVP API Layer (COMPLETADO)

**Fecha:** 2026-03-28
**Estado:** Completado — 20 commits en master, 11 tests pasando

---

## Qué se construyó

La capa API completa de los dos servicios, sin UIs. Permite:
1. Crear tenants y tipos de documento con schemas de campos
2. Subir un documento y extraer campos con Claude Vision
3. Revisar, corregir, confirmar o rechazar la extracción vía API

---

## Stack

- **pnpm workspaces + Turborepo**
- **`@docproc/api-contracts`**: Zod schemas compartidos (`FieldSchemaZ`, `ResolvedSchemaZ`, `WebhookPayloadZ`)
- **`@docproc/typescript-config`**: tsconfig base + nestjs
- **`@docproc/registry`** (port 3001): NestJS 11 + Sequelize 6 + PostgreSQL
- **`@docproc/core`** (port 3002): NestJS 11 + Sequelize 6 + PostgreSQL + Anthropic SDK

---

## Lo que hace cada servicio

### Registry (port 3001)

| Módulo | Endpoints | Qué hace |
|---|---|---|
| Tenants | `POST /tenants`, `GET /tenants`, `GET /tenants/:id` | CRUD; genera API key `dp_...` (SHA-256 hash en DB) |
| DocumentTypes | `POST /document-types`, `GET /document-types?tenantId=`, `GET /document-types/:id` | CRUD tipos de documento por tenant |
| FieldSchemas | `POST /document-types/:id/fields`, `PATCH /document-types/fields/:fieldId`, `DELETE /...`, `PATCH /document-types/:id/fields/reorder` | CRUD + reorden de campos |
| PromptBuilder | — | Genera prompt dinámico desde FieldSchemas o usa promptOverride |
| API Interna | `GET /internal/schema/:documentTypeId`, `GET /internal/tenant/by-api-key/:key` | Consumida por el core; protegida con `X-Internal-Secret` |

### Core (port 3002)

| Módulo | Endpoints | Qué hace |
|---|---|---|
| Documents | `POST /v1/documents` (multipart) | Upload + extracción async (fire-and-forget) |
| | `GET /v1/documents`, `GET /v1/documents/:id` | Listar / ver resultado |
| | `PATCH /v1/documents/:id/fields` | Corregir campos |
| | `POST /v1/documents/:id/confirm` | Confirmar extracción |
| | `POST /v1/documents/:id/reject` | Rechazar / re-procesar |

Todos los endpoints del core requieren `X-Api-Key: dp_...` (validado contra el registry).

---

## Cómo arrancar localmente

```bash
# 1. Clonar y configurar env
cp services/registry/.env.example services/registry/.env
cp services/core/.env.example services/core/.env
# Editar .env de cada servicio:
#   - ANTHROPIC_API_KEY=sk-ant-...
#   - INTERNAL_SECRET=un-secreto-compartido (mismo en ambos)

# 2. Levantar Postgres
docker compose up -d postgres-registry postgres-core

# 3. Instalar deps
pnpm install

# 4. Arrancar servicios (terminales separadas)
cd services/registry && pnpm dev   # → http://localhost:3001
cd services/core && pnpm dev       # → http://localhost:3002
```

---

## Flujo de prueba E2E (curl)

```bash
# 1. Crear tenant
curl -X POST http://localhost:3001/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Vesprini Test"}'
# → {"id":"...","name":"Vesprini Test","apiKey":"dp_...","webhookUrl":null}

# 2. Crear tipo de documento
curl -X POST http://localhost:3001/document-types \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"<id>","name":"Remito","model":"claude-haiku-4-5-20251001"}'

# 3. Agregar campos
curl -X POST http://localhost:3001/document-types/<dtId>/fields \
  -H "Content-Type: application/json" \
  -d '{"key":"numero_remito","label":"N° Remito","type":"text","description":"Número en la parte superior","required":true,"order":0}'

# 4. Ver prompt auto-generado
curl -H "x-internal-secret: <secret>" \
  http://localhost:3001/internal/schema/<dtId>

# 5. Subir documento
curl -X POST http://localhost:3002/v1/documents \
  -H "X-Api-Key: dp_..." \
  -F "file=@/path/to/remito.jpg" \
  -F "documentTypeId=<dtId>"
# → {"id":"...","status":"processing",...}

# 6. Ver resultado
curl -H "X-Api-Key: dp_..." \
  http://localhost:3002/v1/documents/<docId>
# → {"status":"processed","fields":[...],...}

# 7. Confirmar
curl -X POST -H "X-Api-Key: dp_..." \
  http://localhost:3002/v1/documents/<docId>/confirm
```

---

## Tests

```bash
# Registry: 7 tests
cd services/registry && pnpm test

# Core: 4 tests
cd services/core && pnpm test
```

---

## Decisiones técnicas importantes

| Decisión | Por qué |
|---|---|
| API key como `dp_` + 48 chars hex | Identificable en logs; SHA-256 hash en DB (nunca el raw key) |
| Fire-and-forget en extracción | El upload responde inmediatamente con `status: processing`; Claude es lento |
| `INTERNAL_SECRET` requerido (falla al arrancar si falta) | Seguridad fail-fast |
| `encodeURIComponent` en API key lookup | Prevenir path traversal |
| `synchronize: true` en Sequelize | Solo para dev — las tablas se crean al arrancar |
| `outDir`/`baseUrl` override en cada tsconfig | Bug de TypeScript: resuelve paths relativos al archivo base, no al consumidor |
| Sequelize `order` a nivel de query (no en `@HasMany`) | `sequelize-typescript` v2 no acepta `order` en el decorador |
