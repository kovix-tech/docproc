# docproc — Plataforma Modular de Digitalización de Documentos con IA

**Fecha:** 2026-03-27
**Estado:** Aprobado

---

## Problema

El POC actual de Vesprini digitaliza remitos con Claude Vision, pero la lógica de extracción, los campos y la UI están acoplados a un único tipo de documento y cliente. Para escalar el producto a otros clientes (médicas, logísticas, aseguradoras, etc.) se necesita una arquitectura modular donde los campos a reconocer y los tipos de documento puedan variar por cliente.

---

## Solución

Una plataforma de dos servicios con deployment híbrido:

- **`docproc-registry`** — gestiona tenants, tipos de documento, schemas de campos y prompts. Incluye Admin UI.
- **`docproc-core`** — motor de extracción AI, cola de procesamiento, review workflow y API pública.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                    docproc-registry                      │
│  - Gestión de tenants (clientes)                        │
│  - Tipos de documento por tenant                        │
│  - Schemas de campos (nombre, tipo, descripción)        │
│  - Prompts: auto-generado + override opcional           │
│  - Modelo AI por tipo de documento                      │
│  - Admin UI (Next.js)                                   │
│  - API REST interna (consumida por docproc-core)        │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP (schema lookup)
                            │
┌───────────────────────────▼─────────────────────────────┐
│                     docproc-core                         │
│  - Ingesta de documentos (upload / folder watch)        │
│  - Cola de procesamiento                                │
│  - Motor de extracción AI (Claude Vision)               │
│  - Review workflow + UI embebible                       │
│  - API pública REST + Webhooks                          │
│  - Autenticación por API key (por tenant)               │
└─────────────────────────────────────────────────────────┘
         ▲                          ▲
         │ API key                  │ API key
┌────────┴────────┐        ┌───────┴────────┐
│  App Vesprini   │        │  App Médica    │
│  (remitos)      │        │  (recetas)     │
└─────────────────┘        └────────────────┘
```

### Flujo principal

1. Cliente sube documento al core con su `apiKey` y `documentTypeId`
2. Core consulta al registry: schema de campos + prompt para ese tipo de documento
3. Core llama a Claude Vision con ese schema/prompt
4. Resultado queda disponible para revisión en la UI embebible o via webhook

---

## Modelo de datos (registry)

```
Tenant
  id, name, apiKey (hash), webhookUrl?, createdAt

DocumentType
  id, tenantId, name, description
  promptOverride?        # Si está vacío, se auto-genera desde los campos
  model                  # claude-sonnet-4 / claude-haiku-4 / claude-opus-4
  active

FieldSchema
  id, documentTypeId
  key                    # nombre interno (ej: "numero_remito")
  label                  # label para el operador (ej: "N° Remito")
  type                   # text | number | date | enum | boolean
  description            # instrucción para la IA (ej: "número impreso en la parte superior")
  required
  enumOptions?           # ["congelado", "refrigerado", "seco"] para type=enum
  order                  # orden de display en la UI de revisión
```

### Prompt auto-generado

Cuando `promptOverride` está vacío, el sistema construye el prompt dinámicamente a partir de los `FieldSchema`:

```
Extrae los siguientes campos del documento:
- numero_remito (N° Remito): número de remito impreso en la parte superior. [requerido]
- tipo_carga (Tipo de Carga): uno de: congelado, refrigerado, seco, peligroso. [requerido]
- destinatario (Destinatario): nombre completo del destinatario. [opcional]
...
Devolvé un JSON con exactamente estas claves.
```

---

## Modelo de datos (core)

```
Document
  id, tenantId, documentTypeId
  status                 # pending | processing | processed | confirmed | rejected | error
  fileUrl?
  aiModelUsed?, inputTokens?, outputTokens?
  errorMessage?
  createdAt, updatedAt

ExtractionField
  id, documentId
  key, value, confidence?
  corrected              # true si fue editado manualmente por el operador
```

---

## API pública del core

Autenticación: header `X-Api-Key: <tenant-api-key>`

```
POST   /v1/documents                    # Subir documento (imagen/PDF)
GET    /v1/documents/:id                # Estado y resultado de extracción
GET    /v1/documents                    # Listar documentos del tenant
PATCH  /v1/documents/:id/fields         # Corregir campos extraídos
POST   /v1/documents/:id/confirm        # Confirmar extracción
POST   /v1/documents/:id/reject         # Rechazar / re-procesar

GET    /v1/document-types               # Tipos de documento disponibles para el tenant
```

### Webhooks

El tenant puede registrar una URL de webhook. El core hace POST cuando un documento cambia de estado (procesado, confirmado, rechazado).

### Review UI embebible

El core sirve una UI de revisión genérica accesible via JWT de un solo uso:

```
GET /v1/documents/:id/review?token=<jwt>
```

El cliente genera el link y lo embebe en iframe o abre en ventana nueva. El operador revisa, corrige y confirma sin necesidad de construir una UI propia.

---

## API interna del registry (consumida por el core)

Autenticación: header `X-Internal-Secret: <shared-secret>`

```
GET /internal/schema/:documentTypeId       # Schema completo + prompt para un tipo de doc
GET /internal/tenant/by-api-key/:rawKey    # Resolución de API key → tenant
```

---

## Admin UI del registry (flujo)

1. Crear/editar tenant → genera API key
2. Crear tipo de documento → nombre + descripción + modelo AI
3. Agregar/reordenar campos (drag-and-drop): key, label, tipo, descripción, requerido, opciones enum
4. Preview del prompt auto-generado + opción de editarlo manualmente
5. Test: subir documento de prueba y ver resultado de extracción

---

## Deployment híbrido

```
Centralizado (Kovix):          Por cliente (opcional):
┌──────────────────┐           ┌─────────────────────┐
│ docproc-registry │           │   docproc-core      │
│ (un deploy)      │ ────────► │   (deploy dedicado) │
│                  │           │   para cliente X    │
└──────────────────┘           └─────────────────────┘
         │
         └──────────────────► docproc-core (shared)
                               para clientes chicos
```

- Clientes chicos: usan el core compartido
- Clientes enterprise (datos sensibles, compliance): core dedicado apuntando al registry central

---

## Estructura del monorepo

```
docproc/
├── services/
│   ├── core/          # NestJS — motor de extracción + API pública
│   └── registry/      # NestJS — gestión de tenants + Admin UI (Phase 2)
├── packages/
│   ├── api-contracts/ # Zod schemas compartidos (core ↔ registry)
│   └── typescript-config/
├── docker-compose.yml
└── turbo.json
```

---

## Migración desde el POC actual (poc-mrf)

1. Crear tag `v1.0-poc-vesprini` en el commit actual del poc-mrf para preservar el estado funcional
2. Vesprini pasa a ser el **primer tenant**: se configura `DocumentType: Remito` con los campos actuales
3. La app Vesprini (`poc-mrf`) se convierte en cliente del core via API key
4. La lógica de extracción actual (`claude-extraction.ts`) migra al core

---

## Ejemplos de uso por vertical

| Vertical | Tipo de documento | Campos típicos |
|---|---|---|
| Logística | Remito | dador, destinatario, destino, tipo_carga, bultos, kilos |
| Salud | Receta médica | médico, paciente, medicamentos, dosis, fecha |
| Finanzas | Factura | emisor, receptor, items, total, fecha, CAE |
| Seguros | Póliza | asegurado, vigencia, cobertura, prima, vehículo |
| Warehouse | Picking list | orden, productos, cantidades, ubicaciones |
| Técnico | Hoja de servicio | técnico, cliente, equipo, tareas, repuestos |
| Sanitario | Documento sanitario | establecimiento, producto, habilitación, vencimiento |
