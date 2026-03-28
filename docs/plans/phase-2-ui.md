# docproc — Phase 2: UIs + Webhooks + Migración Vesprini

**Fecha:** 2026-03-28
**Estado:** Pendiente

---

## Scope

Agregar las interfaces gráficas y completar el producto para que sea usable sin necesidad de curl.

---

## Task 1: Admin UI del registry (Next.js)

Ubicación sugerida: `services/registry/src/ui/` (Next.js app embebida en el NestJS, servida desde `/admin`)

O alternativamente: una app Next.js separada en `services/registry-ui/`.

### Páginas

1. **`/admin/tenants`** — Lista de tenants + botón "Nuevo Tenant"
2. **`/admin/tenants/new`** — Form: nombre + webhookUrl (opcional) → muestra la API key generada UNA SOLA VEZ
3. **`/admin/tenants/:id`** — Detalle del tenant + lista de tipos de documento
4. **`/admin/document-types/new?tenantId=`** — Form: nombre + descripción + modelo AI
5. **`/admin/document-types/:id`** — Editor de campos:
   - Lista de campos con drag-and-drop para reordenar
   - Agregar campo: key, label, tipo, descripción, required, opciones enum
   - Preview del prompt auto-generado
   - Override manual del prompt (textarea)
6. **`/admin/document-types/:id/test`** — Upload de documento de prueba → ver resultado de extracción

### Stack sugerido

- Next.js 15 + Tailwind 4 + shadcn/ui (mismo que poc-mrf)
- `@dnd-kit/core` para drag-and-drop de campos

---

## Task 2: Review UI embebible (en core)

Una página genérica servida por el core que permite revisar, corregir y confirmar un documento.

### Acceso

```
GET /v1/documents/:id/review?token=<jwt-one-time>
```

El tenant genera el JWT con la API del core:
```
POST /v1/documents/:id/review-token   → { token, expiresAt }
```

### Página

- Muestra la imagen del documento (lado izquierdo)
- Lista de campos extraídos con posibilidad de editar inline (lado derecho)
- Botones: "Confirmar" / "Rechazar"
- Funciona sin autenticación propia (el JWT es el auth)

### Stack sugerido

- Next.js app embebida en el core, servida desde `/review`
- El JWT tiene TTL corto (15 minutos)

---

## Task 3: Webhooks

Cuando un documento cambia de estado (`processed`, `confirmed`, `rejected`), el core hace POST al `webhookUrl` del tenant.

### Implementación

```typescript
// En DocumentsService, después de cada cambio de estado:
if (tenant.webhookUrl) {
  await this.webhookService.dispatch(tenant.webhookUrl, {
    event: 'document.confirmed',
    documentId: doc.id,
    tenantId: doc.tenantId,
    documentTypeId: doc.documentTypeId,
    status: doc.status,
    timestamp: new Date().toISOString(),
  });
}
```

- Usar `WebhookPayloadZ` de `@docproc/api-contracts` para tipear el payload
- Retry con backoff exponencial (3 intentos)
- No bloquear el request si el webhook falla

---

## Task 4: Migración Vesprini (primer tenant)

1. Crear tag `v1.0-poc-vesprini` en `poc-mrf` para preservar el estado funcional
2. En docproc: crear tenant "Vesprini" via Admin UI
3. Crear `DocumentType: Remito` con los campos del poc-mrf:
   - `numero_remito` (text, requerido)
   - `dador_carga` (text, requerido)
   - `destinatario` (text, requerido)
   - `destino` (text, requerido)
   - `tipo_carga` (enum: congelado/supercongelado/refrigerado/seco/peligroso/mixto, requerido)
   - `bultos` (number, opcional)
   - `kilos` (number, opcional)
   - `fecha` (date, opcional)
4. Configurar el poc-mrf para usar el core via API key (reemplazar `claude-extraction.ts`)

---

## Task 5: CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
```

---

## Task 6: Migraciones de DB formales

Reemplazar `synchronize: true` (dev-only) con Sequelize CLI migrations.

```
services/registry/src/database/migrations/
  001-create-tenants.ts
  002-create-document-types.ts
  003-create-field-schemas.ts
```

---

## Notas de diseño para Phase 2

- La Admin UI puede ser simple (no necesita ser bonita para el MVP). Lo importante es que funcione.
- La Review UI debe funcionar bien en mobile (los operadores de Vesprini van a usarla desde tablet/celular).
- Los webhooks son importantes para la integración con el ERP de Vesprini (Deic/Deonic).
- El JWT de la Review UI debe ser de un solo uso (invalidar después del primer uso) para evitar que se comparta.
