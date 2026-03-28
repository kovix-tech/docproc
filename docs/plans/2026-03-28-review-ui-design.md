# Review UI Design — docproc Phase 2, Task 2

**Fecha:** 2026-03-28
**Estado:** Aprobado

---

## Contexto

Agregar una Review UI embebible en el core service que permite a los operadores revisar, corregir y confirmar/rechazar documentos extraídos, sin necesitar autenticación propia (el JWT es el auth).

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| File storage | Disco local (`uploads/`) | Simple para dev; migración a Supabase Storage es reemplazar solo `StorageService` |
| JWT invalidación | Al confirmar/rechazar (no al cargar la página) | Permite refrescar la página sin perder el acceso |
| JWT ID | `jti` UUID guardado en Document (`reviewTokenJti`) | Sin Redis; persiste entre reinicios |
| UI rendering | Next.js static export, mismo patrón que Admin UI | Un solo proceso, consistente con la arquitectura |
| Layout | Mobile-first responsive | Operadores de Vesprini usan tablet/celular |

---

## Cambios en el backend (core)

### Document model — campos nuevos

```
filePath: TEXT (nullable)          — ruta relativa en disco: uploads/<documentId>.<ext>
reviewTokenJti: STRING (nullable)  — UUID del token activo; null = sin token / ya usado
```

### Guardado de archivos

- **Dev:** `services/core/uploads/<documentId>.<ext>` (directorio gitignored)
- **Producción:** misma interfaz (`StorageService`), implementación swappable a Supabase Storage
- Al subir un documento, el archivo se guarda en disco Y se procesa con Claude
- `filePath` se guarda en la DB

### StorageService

Abstracción simple con dos métodos:
```typescript
save(documentId: string, buffer: Buffer, mimeType: string): Promise<string>  // returns filePath
getUrl(filePath: string): string  // returns URL for client
```

En dev: guarda en `uploads/`, retorna `/v1/files/<documentId>`
En producción (Supabase): sube a bucket, retorna URL pública

### Nuevos endpoints

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/v1/documents/:id/review-token` | ApiKeyGuard | Genera JWT, guarda jti en DB. Retorna `{ token, expiresAt }` |
| `GET` | `/v1/documents/:id/review-data` | ReviewTokenGuard | Campos + fileUrl + status del documento |
| `PATCH` | `/v1/documents/:id/review-fields` | ReviewTokenGuard | Corrige campos (misma lógica que patchFields) |
| `POST` | `/v1/documents/:id/review-confirm` | ReviewTokenGuard | Confirma + invalida jti |
| `POST` | `/v1/documents/:id/review-reject` | ReviewTokenGuard | Rechaza + invalida jti |
| `GET` | `/v1/files/:documentId` | ReviewTokenGuard (token in query) | Sirve la imagen desde disco |

### ReviewTokenGuard

- Lee `token` del query string (`?token=xxx`)
- Verifica firma JWT con `REVIEW_JWT_SECRET`
- Verifica `exp` (TTL 15 min)
- Verifica `document.reviewTokenJti === jwt.jti` (no revocado / es el token actual)
- Extrae `documentId` del payload y lo valida contra el `:id` del path

### JWT payload

```typescript
{
  documentId: string
  tenantId: string
  jti: string       // UUID único por token generado
  iat: number
  exp: number       // iat + 15 min
}
```

### Variable de entorno nueva

```
REVIEW_JWT_SECRET=change-me-in-production
```

---

## Review UI (Next.js)

### Ubicación

`services/core/review/` — app Next.js separada dentro del core service.

### Configuración

```typescript
// next.config.ts
{
  output: 'export',
  basePath: '/review',
  trailingSlash: true,
  images: { unoptimized: true },
}
```

NestJS sirve `review/out/` desde `/review` con `ServeStaticModule`.

### Páginas

Una sola página: `src/app/page.tsx`

Lee `?token=xxx` del URL → llama `GET /v1/documents/:id/review-data?token=xxx`.

### Layout (responsive)

```
Mobile:                         Desktop (md+):
┌──────────────────┐            ┌──────────────┬─────────────────┐
│    Imagen        │            │              │  Campo 1: ____  │
│   documento      │            │    Imagen    │  Campo 2: ____  │
├──────────────────┤            │   documento  │  Campo 3: ____  │
│  Campo 1: ____   │            │              ├─────────────────┤
│  Campo 2: ____   │            │              │  [✓] [✗]        │
│  Campo 3: ____   │            └──────────────┴─────────────────┘
├──────────────────┤
│ [Confirmar] [Rechazar] │
└──────────────────┘
```

### Estados de la página

| Estado | Qué muestra |
|--------|-------------|
| Loading | Spinner / "Cargando..." |
| Token inválido/expirado | Error claro: "Este enlace expiró o ya fue utilizado" |
| `confirmed` / `rejected` | "Este documento ya fue procesado" (sin botones de acción) |
| `processed` | Imagen + campos editables + botones Confirmar/Rechazar |
| Error de red | Mensaje de error con opción de reintentar |

### Stack

- Next.js 15 + Tailwind v4 + shadcn/ui (sin dnd-kit — no necesita reordenar)
- Sin autenticación propia (el JWT en el query string es el auth)
- Campos editables inline (input directo, sin modal)

---

## Dev workflow

```bash
# Dev: Next.js hot reload en puerto separado
cd services/core/review && pnpm dev   # :3004

# Producción: build estático servido por NestJS
cd services/core/review && pnpm build   # genera review/out/
cd services/core && pnpm start           # NestJS sirve /review
```

Scripts en `services/core/package.json`:
```json
"build:review": "cd review && pnpm build",
"build:all": "pnpm build:review && pnpm build"
```

---

## Migración futura a Supabase Storage

Para migrar de disco a Supabase Storage:
1. Implementar `SupabaseStorageService` con la misma interfaz que `LocalStorageService`
2. Cambiar el provider en `StorageModule` según `STORAGE_PROVIDER=supabase`
3. Agregar `SUPABASE_URL` y `SUPABASE_KEY` al `.env`
4. Migrar archivos existentes con un script de migración

No se necesita cambiar ningún otro código.

---

## Notas

- El directorio `uploads/` debe estar en el `.gitignore` del core
- En producción, `uploads/` necesita un volumen persistente (Docker volume o similar)
- Los PDFs se sirven directamente; el browser los renderiza inline con `<iframe>` o `<embed>`
- El campo `fileUrl` en el modelo se mantiene (era null, ahora se populará con la URL del endpoint de archivo)
