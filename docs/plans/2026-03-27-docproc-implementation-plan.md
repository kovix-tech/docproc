# docproc — Plan de Implementación (MVP: API Layer)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir el monorepo `docproc` con dos servicios NestJS (`registry` + `core`) que habiliten la extracción de campos de documentos de forma multi-tenant y configurable por cliente.

**Architecture:** `docproc-registry` gestiona tenants, tipos de documento y schemas de campos; `docproc-core` recibe documentos, consulta el registry para obtener el schema, llama a Claude Vision y expone el resultado para revisión. Los servicios se comunican HTTP internamente. Los tenants autentican contra el core con API key.

**Tech Stack:** pnpm workspaces + Turborepo, NestJS 11 + Sequelize 6 + PostgreSQL, Zod (api-contracts), Anthropic SDK, Jest + Supertest.

**Scope de este plan:** Solo la capa API (sin UIs). La Admin UI y Review UI son Phase 2.

**Repo destino:** `/home/mrf/vesprini/docproc` (nuevo repo git separado)

---

## Task 1: Crear repo + estructura base del monorepo

**Files:**
- Create: `/home/mrf/vesprini/docproc/` (directorio raíz)
- Create: `package.json` (raíz)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.nvmrc`

**Step 1: Crear directorio e init git**

```bash
mkdir -p /home/mrf/vesprini/docproc
cd /home/mrf/vesprini/docproc
git init
```

**Step 2: Crear root package.json**

```json
{
  "name": "docproc",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

**Step 3: Crear pnpm-workspace.yaml**

```yaml
packages:
  - "services/*"
  - "packages/*"
```

**Step 4: Crear turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

**Step 5: Crear .nvmrc**

```
20
```

**Step 6: Crear .gitignore**

```
node_modules/
dist/
.env
.env.local
*.tsbuildinfo
```

**Step 7: Crear estructura de directorios vacíos**

```bash
mkdir -p services/registry services/core
mkdir -p packages/api-contracts packages/typescript-config
```

**Step 8: Instalar deps raíz**

```bash
pnpm install
```

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: init docproc monorepo"
```

---

## Task 2: Package `typescript-config`

**Files:**
- Create: `packages/typescript-config/package.json`
- Create: `packages/typescript-config/base.json`
- Create: `packages/typescript-config/nestjs.json`

**Step 1: Crear package.json**

```json
{
  "name": "@docproc/typescript-config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./base": "./base.json",
    "./nestjs": "./nestjs.json"
  }
}
```

**Step 2: Crear base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 3: Crear nestjs.json**

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "baseUrl": "."
  }
}
```

**Step 4: Commit**

```bash
git add packages/typescript-config
git commit -m "chore: add typescript-config shared package"
```

---

## Task 3: Package `api-contracts` — Zod schemas inter-servicio

**Files:**
- Create: `packages/api-contracts/package.json`
- Create: `packages/api-contracts/tsconfig.json`
- Create: `packages/api-contracts/src/index.ts`
- Create: `packages/api-contracts/src/registry.ts`
- Test: `packages/api-contracts/src/registry.test.ts`

**Step 1: Crear package.json**

```json
{
  "name": "@docproc/api-contracts",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@docproc/typescript-config": "workspace:*",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Crear tsconfig.json**

```json
{
  "extends": "@docproc/typescript-config/base",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Escribir el test primero (TDD)**

`packages/api-contracts/src/registry.test.ts`:

```typescript
import { FieldSchemaZ, DocumentTypeSchemaZ, ResolvedSchemaZ } from './registry';

describe('api-contracts / registry', () => {
  it('validates a valid FieldSchema', () => {
    const result = FieldSchemaZ.safeParse({
      id: 'f1',
      key: 'numero_remito',
      label: 'N° Remito',
      type: 'text',
      description: 'Número en la parte superior',
      required: true,
      order: 0,
    });
    expect(result.success).toBe(true);
  });

  it('validates enum field with options', () => {
    const result = FieldSchemaZ.safeParse({
      id: 'f2',
      key: 'tipo_carga',
      label: 'Tipo de Carga',
      type: 'enum',
      description: 'Tipo de carga',
      required: true,
      enumOptions: ['congelado', 'refrigerado', 'seco'],
      order: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects enum field without options', () => {
    const result = FieldSchemaZ.safeParse({
      id: 'f3',
      key: 'tipo_carga',
      label: 'Tipo de Carga',
      type: 'enum',
      description: 'Tipo de carga',
      required: true,
      order: 2,
    });
    expect(result.success).toBe(false);
  });

  it('validates a ResolvedSchema', () => {
    const result = ResolvedSchemaZ.safeParse({
      documentTypeId: 'dt1',
      documentTypeName: 'Remito',
      model: 'claude-sonnet-4-20250514',
      prompt: 'Extrae los campos del documento...',
      fields: [],
    });
    expect(result.success).toBe(true);
  });
});
```

**Step 4: Correr test — debe fallar**

```bash
cd packages/api-contracts && pnpm test
```
Expected: FAIL — `registry.ts` no existe aún

**Step 5: Implementar `registry.ts`**

`packages/api-contracts/src/registry.ts`:

```typescript
import { z } from 'zod';

export const FieldTypeZ = z.enum(['text', 'number', 'date', 'enum', 'boolean']);
export type FieldType = z.infer<typeof FieldTypeZ>;

export const FieldSchemaZ = z
  .object({
    id: z.string(),
    key: z.string().regex(/^[a-z][a-z0-9_]*$/, 'key debe ser snake_case'),
    label: z.string().min(1),
    type: FieldTypeZ,
    description: z.string(),
    required: z.boolean(),
    enumOptions: z.array(z.string()).optional(),
    order: z.number().int().min(0),
  })
  .refine(
    (f) => f.type !== 'enum' || (f.enumOptions && f.enumOptions.length > 0),
    { message: 'enum fields must have enumOptions', path: ['enumOptions'] },
  );
export type FieldSchema = z.infer<typeof FieldSchemaZ>;

export const AIModelZ = z.enum([
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-20250514',
]);
export type AIModel = z.infer<typeof AIModelZ>;

// Lo que el core recibe del registry cuando hace lookup
export const ResolvedSchemaZ = z.object({
  documentTypeId: z.string(),
  documentTypeName: z.string(),
  model: AIModelZ,
  prompt: z.string(), // Ya procesado: override o auto-generado
  fields: z.array(FieldSchemaZ),
});
export type ResolvedSchema = z.infer<typeof ResolvedSchemaZ>;

// Lo que el core envía al webhook del tenant
export const WebhookPayloadZ = z.object({
  event: z.enum(['document.processed', 'document.confirmed', 'document.rejected']),
  documentId: z.string(),
  tenantId: z.string(),
  documentTypeId: z.string(),
  status: z.string(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadZ>;
```

**Step 6: Crear `src/index.ts`**

```typescript
export * from './registry';
```

**Step 7: Configurar jest en package.json**

Agregar en `packages/api-contracts/package.json`:
```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node"
}
```

**Step 8: Correr test — debe pasar**

```bash
pnpm test
```
Expected: PASS — 4 tests passed

**Step 9: Build**

```bash
pnpm build
```

**Step 10: Commit**

```bash
git add packages/api-contracts
git commit -m "feat: add api-contracts package with Zod schemas"
```

---

## Task 4: Scaffold NestJS `registry` service

**Files:**
- Create: `services/registry/package.json`
- Create: `services/registry/tsconfig.json`
- Create: `services/registry/src/main.ts`
- Create: `services/registry/src/app.module.ts`

**Step 1: Instalar NestJS CLI globalmente (si no está)**

```bash
pnpm add -g @nestjs/cli
```

**Step 2: Crear package.json del registry**

`services/registry/package.json`:

```json
{
  "name": "@docproc/registry",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/sequelize": "^11.0.0",
    "sequelize": "^6.37.0",
    "sequelize-typescript": "^2.1.0",
    "pg": "^8.13.0",
    "pg-hstore": "^2.3.4",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "@docproc/api-contracts": "workspace:*",
    "crypto": "^1.0.1",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@docproc/typescript-config": "workspace:*",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/sequelize": "^4.28.0",
    "@types/uuid": "^10.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^22.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 3: Crear tsconfig.json**

```json
{
  "extends": "@docproc/typescript-config/nestjs",
  "compilerOptions": {
    "paths": {
      "@docproc/api-contracts": ["../../packages/api-contracts/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**Step 4: Crear nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

**Step 5: Crear `src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Registry running on port ${port}`);
}
bootstrap();
```

**Step 6: Crear `src/app.module.ts` (esqueleto, sin DB aún)**

```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [],
})
export class AppModule {}
```

**Step 7: Instalar deps**

```bash
cd /home/mrf/vesprini/docproc && pnpm install
```

**Step 8: Verificar que compila**

```bash
cd services/registry && pnpm build
```
Expected: BUILD OK

**Step 9: Commit**

```bash
git add services/registry
git commit -m "chore: scaffold registry NestJS service"
```

---

## Task 5: Registry — DB connection + modelos Sequelize

**Files:**
- Create: `services/registry/src/database/database.module.ts`
- Create: `services/registry/src/database/models/tenant.model.ts`
- Create: `services/registry/src/database/models/document-type.model.ts`
- Create: `services/registry/src/database/models/field-schema.model.ts`
- Modify: `services/registry/src/app.module.ts`
- Create: `services/registry/.env.example`

**Step 1: Crear `.env.example`**

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/docproc_registry
PORT=3001
INTERNAL_SECRET=change-me-in-production
```

**Step 2: Crear `database.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Tenant } from './models/tenant.model';
import { DocumentType } from './models/document-type.model';
import { FieldSchema } from './models/field-schema.model';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      uri: process.env.DATABASE_URL,
      models: [Tenant, DocumentType, FieldSchema],
      autoLoadModels: true,
      synchronize: true, // Solo para dev; en prod usar migraciones
      logging: false,
    }),
  ],
})
export class DatabaseModule {}
```

**Step 3: Crear `models/tenant.model.ts`**

```typescript
import {
  Column, DataType, Default, HasMany,
  Model, PrimaryKey, Table, Unique,
} from 'sequelize-typescript';
import { DocumentType } from './document-type.model';

@Table({ tableName: 'tenants', timestamps: true })
export class Tenant extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  // Almacenamos el hash SHA-256 de la API key
  @Unique
  @Column({ type: DataType.STRING, allowNull: false })
  declare apiKeyHash: string;

  // Solo devuelta una vez al crear (no se persiste en claro)
  @Column({ type: DataType.STRING, allowNull: true })
  declare webhookUrl: string | null;

  @HasMany(() => DocumentType)
  declare documentTypes: DocumentType[];
}
```

**Step 4: Crear `models/document-type.model.ts`**

```typescript
import {
  BelongsTo, Column, DataType, Default,
  ForeignKey, HasMany, Model, PrimaryKey, Table,
} from 'sequelize-typescript';
import { Tenant } from './tenant.model';
import { FieldSchema } from './field-schema.model';

@Table({ tableName: 'document_types', timestamps: true })
export class DocumentType extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  declare tenantId: string;

  @BelongsTo(() => Tenant)
  declare tenant: Tenant;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare promptOverride: string | null;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'claude-sonnet-4-20250514' })
  declare model: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare active: boolean;

  @HasMany(() => FieldSchema, { order: [['order', 'ASC']] })
  declare fields: FieldSchema[];
}
```

**Step 5: Crear `models/field-schema.model.ts`**

```typescript
import {
  BelongsTo, Column, DataType, Default,
  ForeignKey, Model, PrimaryKey, Table,
} from 'sequelize-typescript';
import { DocumentType } from './document-type.model';

@Table({ tableName: 'field_schemas', timestamps: true })
export class FieldSchema extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => DocumentType)
  @Column({ type: DataType.UUID, allowNull: false })
  declare documentTypeId: string;

  @BelongsTo(() => DocumentType)
  declare documentType: DocumentType;

  @Column({ type: DataType.STRING, allowNull: false })
  declare key: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare label: string;

  @Column({ type: DataType.ENUM('text', 'number', 'date', 'enum', 'boolean'), allowNull: false })
  declare type: string;

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' })
  declare description: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare required: boolean;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare enumOptions: string[] | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare order: number;
}
```

**Step 6: Actualizar `app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule],
})
export class AppModule {}
```

**Step 7: Verificar que compila**

```bash
cd services/registry && pnpm build
```
Expected: BUILD OK

**Step 8: Commit**

```bash
git add services/registry
git commit -m "feat: registry DB models (Tenant, DocumentType, FieldSchema)"
```

---

## Task 6: Registry — módulo Tenant (CRUD + generación de API key)

**Files:**
- Create: `services/registry/src/tenants/tenants.module.ts`
- Create: `services/registry/src/tenants/tenants.service.ts`
- Create: `services/registry/src/tenants/tenants.controller.ts`
- Create: `services/registry/src/tenants/dto/create-tenant.dto.ts`
- Test: `services/registry/src/tenants/tenants.service.spec.ts`
- Modify: `services/registry/src/app.module.ts`

**Step 1: Crear DTO**

`src/tenants/dto/create-tenant.dto.ts`:

```typescript
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;
}
```

**Step 2: Escribir test del service (TDD)**

`src/tenants/tenants.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { TenantsService } from './tenants.service';
import { Tenant } from '../database/models/tenant.model';

const mockTenant = {
  id: 'tenant-uuid',
  name: 'Vesprini',
  apiKeyHash: 'hash123',
  webhookUrl: null,
  save: jest.fn(),
};

const mockTenantModel = {
  create: jest.fn().mockResolvedValue(mockTenant),
  findAll: jest.fn().mockResolvedValue([mockTenant]),
  findByPk: jest.fn().mockResolvedValue(mockTenant),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getModelToken(Tenant), useValue: mockTenantModel },
      ],
    }).compile();
    service = module.get(TenantsService);
  });

  it('creates tenant and returns plaintext API key', async () => {
    const result = await service.create({ name: 'Vesprini' });
    expect(result.name).toBe('Vesprini');
    expect(result.apiKey).toMatch(/^dp_/); // El prefijo de nuestra API key
    expect(mockTenantModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Vesprini' }),
    );
  });

  it('findAll returns list of tenants', async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Vesprini');
  });
});
```

**Step 3: Correr test — debe fallar**

```bash
cd services/registry && pnpm test tenants.service
```
Expected: FAIL — `TenantsService` no existe

**Step 4: Implementar `tenants.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHash, randomBytes } from 'crypto';
import { Tenant } from '../database/models/tenant.model';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(@InjectModel(Tenant) private readonly tenantModel: typeof Tenant) {}

  async create(dto: CreateTenantDto): Promise<{ name: string; id: string; apiKey: string; webhookUrl: string | null }> {
    const rawKey = `dp_${randomBytes(24).toString('hex')}`;
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const tenant = await this.tenantModel.create({
      name: dto.name,
      apiKeyHash: hash,
      webhookUrl: dto.webhookUrl ?? null,
    });
    return { id: tenant.id, name: tenant.name, apiKey: rawKey, webhookUrl: tenant.webhookUrl };
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantModel.findAll();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findByPk(id);
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async resolveByApiKey(rawKey: string): Promise<Tenant | null> {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    return this.tenantModel.findOne({ where: { apiKeyHash: hash } });
  }
}
```

**Step 5: Implementar `tenants.controller.ts`**

```typescript
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }
}
```

**Step 6: Crear `tenants.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Tenant } from '../database/models/tenant.model';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [SequelizeModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
```

**Step 7: Agregar `TenantsModule` al `AppModule`**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [DatabaseModule, TenantsModule],
})
export class AppModule {}
```

**Step 8: Correr test — debe pasar**

```bash
pnpm test tenants.service
```
Expected: PASS — 2 tests passed

**Step 9: Commit**

```bash
git add services/registry
git commit -m "feat: registry Tenant module (CRUD + API key generation)"
```

---

## Task 7: Registry — módulo DocumentType + FieldSchema

**Files:**
- Create: `services/registry/src/document-types/document-types.module.ts`
- Create: `services/registry/src/document-types/document-types.service.ts`
- Create: `services/registry/src/document-types/document-types.controller.ts`
- Create: `services/registry/src/document-types/dto/*.dto.ts`
- Test: `services/registry/src/document-types/document-types.service.spec.ts`

**Step 1: Crear DTOs**

`src/document-types/dto/create-document-type.dto.ts`:

```typescript
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const AI_MODELS = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-20250514'] as const;

export class CreateDocumentTypeDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  promptOverride?: string;

  @IsEnum(AI_MODELS)
  @IsOptional()
  model?: string;
}
```

`src/document-types/dto/create-field-schema.dto.ts`:

```typescript
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, Validate, ValidateIf } from 'class-validator';

export class CreateFieldSchemaDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsEnum(['text', 'number', 'date', 'enum', 'boolean'])
  type: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  required: boolean;

  @IsArray()
  @IsString({ each: true })
  @ValidateIf((o) => o.type === 'enum')
  enumOptions?: string[];

  @IsInt()
  @Min(0)
  order: number;
}
```

`src/document-types/dto/reorder-fields.dto.ts`:

```typescript
import { IsArray, IsString } from 'class-validator';

export class ReorderFieldsDto {
  @IsArray()
  @IsString({ each: true })
  fieldIds: string[]; // Orden deseado de IDs
}
```

**Step 2: Escribir tests (TDD)**

`src/document-types/document-types.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DocumentTypesService } from './document-types.service';
import { DocumentType } from '../database/models/document-type.model';
import { FieldSchema } from '../database/models/field-schema.model';

const mockDocType = {
  id: 'dt1',
  tenantId: 'tenant1',
  name: 'Remito',
  promptOverride: null,
  model: 'claude-sonnet-4-20250514',
  active: true,
  fields: [],
};

const mockDocTypeModel = {
  create: jest.fn().mockResolvedValue(mockDocType),
  findAll: jest.fn().mockResolvedValue([mockDocType]),
  findByPk: jest.fn().mockResolvedValue(mockDocType),
};

const mockFieldSchemaModel = {
  create: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn(),
};

describe('DocumentTypesService', () => {
  let service: DocumentTypesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentTypesService,
        { provide: getModelToken(DocumentType), useValue: mockDocTypeModel },
        { provide: getModelToken(FieldSchema), useValue: mockFieldSchemaModel },
      ],
    }).compile();
    service = module.get(DocumentTypesService);
  });

  it('creates a document type', async () => {
    const result = await service.create({ tenantId: 'tenant1', name: 'Remito' });
    expect(result.name).toBe('Remito');
    expect(mockDocTypeModel.create).toHaveBeenCalled();
  });

  it('finds document types by tenant', async () => {
    const result = await service.findByTenant('tenant1');
    expect(result).toHaveLength(1);
  });
});
```

**Step 3: Correr test — debe fallar**

```bash
pnpm test document-types.service
```

**Step 4: Implementar `document-types.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DocumentType } from '../database/models/document-type.model';
import { FieldSchema } from '../database/models/field-schema.model';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { CreateFieldSchemaDto } from './dto/create-field-schema.dto';
import { ReorderFieldsDto } from './dto/reorder-fields.dto';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectModel(DocumentType) private readonly dtModel: typeof DocumentType,
    @InjectModel(FieldSchema) private readonly fieldModel: typeof FieldSchema,
  ) {}

  async create(dto: CreateDocumentTypeDto): Promise<DocumentType> {
    return this.dtModel.create({ ...dto, active: true });
  }

  async findByTenant(tenantId: string): Promise<DocumentType[]> {
    return this.dtModel.findAll({ where: { tenantId }, include: [FieldSchema] });
  }

  async findById(id: string): Promise<DocumentType> {
    const dt = await this.dtModel.findByPk(id, { include: [FieldSchema] });
    if (!dt) throw new NotFoundException(`DocumentType ${id} not found`);
    return dt;
  }

  async addField(documentTypeId: string, dto: CreateFieldSchemaDto): Promise<FieldSchema> {
    return this.fieldModel.create({ ...dto, documentTypeId });
  }

  async updateField(fieldId: string, dto: Partial<CreateFieldSchemaDto>): Promise<FieldSchema> {
    const field = await this.fieldModel.findByPk(fieldId);
    if (!field) throw new NotFoundException(`FieldSchema ${fieldId} not found`);
    return field.update(dto);
  }

  async deleteField(fieldId: string): Promise<void> {
    const field = await this.fieldModel.findByPk(fieldId);
    if (!field) throw new NotFoundException(`FieldSchema ${fieldId} not found`);
    await field.destroy();
  }

  async reorderFields(documentTypeId: string, dto: ReorderFieldsDto): Promise<void> {
    await Promise.all(
      dto.fieldIds.map((id, index) =>
        this.fieldModel.update({ order: index }, { where: { id, documentTypeId } }),
      ),
    );
  }
}
```

**Step 5: Implementar `document-types.controller.ts`**

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DocumentTypesService } from './document-types.service';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { CreateFieldSchemaDto } from './dto/create-field-schema.dto';
import { ReorderFieldsDto } from './dto/reorder-fields.dto';

@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly service: DocumentTypesService) {}

  @Post()
  create(@Body() dto: CreateDocumentTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  findByTenant(@Query('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id/fields')
  addField(@Param('id') id: string, @Body() dto: CreateFieldSchemaDto) {
    return this.service.addField(id, dto);
  }

  @Patch(':id/fields/reorder')
  reorderFields(@Param('id') id: string, @Body() dto: ReorderFieldsDto) {
    return this.service.reorderFields(id, dto);
  }

  @Patch('fields/:fieldId')
  updateField(@Param('fieldId') fieldId: string, @Body() dto: Partial<CreateFieldSchemaDto>) {
    return this.service.updateField(fieldId, dto);
  }

  @Delete('fields/:fieldId')
  deleteField(@Param('fieldId') fieldId: string) {
    return this.service.deleteField(fieldId);
  }
}
```

**Step 6: Crear `document-types.module.ts` y actualizar `app.module.ts`**

```typescript
// document-types.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DocumentType } from '../database/models/document-type.model';
import { FieldSchema } from '../database/models/field-schema.model';
import { DocumentTypesController } from './document-types.controller';
import { DocumentTypesService } from './document-types.service';

@Module({
  imports: [SequelizeModule.forFeature([DocumentType, FieldSchema])],
  controllers: [DocumentTypesController],
  providers: [DocumentTypesService],
  exports: [DocumentTypesService],
})
export class DocumentTypesModule {}
```

En `app.module.ts`, agregar `DocumentTypesModule`.

**Step 7: Correr test — debe pasar**

```bash
pnpm test document-types.service
```
Expected: PASS

**Step 8: Commit**

```bash
git add services/registry
git commit -m "feat: registry DocumentType + FieldSchema modules (CRUD)"
```

---

## Task 8: Registry — PromptBuilder + API interna

**Files:**
- Create: `services/registry/src/prompt/prompt-builder.service.ts`
- Test: `services/registry/src/prompt/prompt-builder.service.spec.ts`
- Create: `services/registry/src/internal/internal.module.ts`
- Create: `services/registry/src/internal/internal.controller.ts`
- Create: `services/registry/src/internal/internal-auth.guard.ts`

**Step 1: Escribir test del PromptBuilder**

`src/prompt/prompt-builder.service.spec.ts`:

```typescript
import { PromptBuilderService } from './prompt-builder.service';

const fields = [
  { key: 'numero_remito', label: 'N° Remito', type: 'text', description: 'Número en la parte superior', required: true, order: 0, enumOptions: null },
  { key: 'tipo_carga', label: 'Tipo de Carga', type: 'enum', description: 'Tipo de carga', required: true, order: 1, enumOptions: ['congelado', 'refrigerado', 'seco'] },
  { key: 'destinatario', label: 'Destinatario', type: 'text', description: 'Nombre completo', required: false, order: 2, enumOptions: null },
];

describe('PromptBuilderService', () => {
  const svc = new PromptBuilderService();

  it('builds a prompt from field schemas', () => {
    const prompt = svc.build(fields as any);
    expect(prompt).toContain('numero_remito');
    expect(prompt).toContain('[requerido]');
    expect(prompt).toContain('congelado, refrigerado, seco');
    expect(prompt).toContain('[opcional]');
    expect(prompt).toContain('JSON');
  });

  it('returns override if provided', () => {
    const override = 'Mi prompt personalizado';
    const prompt = svc.buildOrOverride(fields as any, override);
    expect(prompt).toBe(override);
  });
});
```

**Step 2: Correr test — debe fallar**

```bash
pnpm test prompt-builder
```

**Step 3: Implementar `prompt-builder.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { FieldSchema } from '../database/models/field-schema.model';

@Injectable()
export class PromptBuilderService {
  build(fields: FieldSchema[]): string {
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const lines = sorted.map((f) => {
      const req = f.required ? '[requerido]' : '[opcional]';
      const opts = f.enumOptions?.length ? ` Opciones: ${f.enumOptions.join(', ')}.` : '';
      return `- ${f.key} (${f.label}): ${f.description}${opts} ${req}`;
    });
    return [
      'Extrae los siguientes campos del documento y devolvé un JSON con exactamente estas claves:',
      '',
      ...lines,
      '',
      'Si un campo no está presente en el documento, usa null.',
      'Responde ÚNICAMENTE con el JSON, sin texto adicional.',
    ].join('\n');
  }

  buildOrOverride(fields: FieldSchema[], promptOverride?: string | null): string {
    return promptOverride?.trim() || this.build(fields);
  }
}
```

**Step 4: Correr test — debe pasar**

```bash
pnpm test prompt-builder
```
Expected: PASS — 2 tests passed

**Step 5: Crear `internal-auth.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_SECRET) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    return true;
  }
}
```

**Step 6: Crear `internal.controller.ts`**

Esta es la API que llama el core para obtener el schema completo de un tipo de documento.

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';
import { DocumentTypesService } from '../document-types/document-types.service';
import { TenantsService } from '../tenants/tenants.service';
import { PromptBuilderService } from '../prompt/prompt-builder.service';
import type { ResolvedSchema } from '@docproc/api-contracts';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(
    private readonly dtService: DocumentTypesService,
    private readonly tenantsService: TenantsService,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  // El core llama esto enviando el rawApiKey y el documentTypeId
  @Get('schema/:documentTypeId')
  async resolveSchema(
    @Param('documentTypeId') documentTypeId: string,
  ): Promise<ResolvedSchema> {
    const dt = await this.dtService.findById(documentTypeId);
    const prompt = this.promptBuilder.buildOrOverride(dt.fields, dt.promptOverride);
    return {
      documentTypeId: dt.id,
      documentTypeName: dt.name,
      model: dt.model as any,
      prompt,
      fields: dt.fields.map((f) => ({
        id: f.id,
        key: f.key,
        label: f.label,
        type: f.type as any,
        description: f.description,
        required: f.required,
        enumOptions: f.enumOptions ?? undefined,
        order: f.order,
      })),
    };
  }

  // El core verifica la API key del tenant
  @Get('tenant/by-api-key/:rawKey')
  async resolveByApiKey(@Param('rawKey') rawKey: string) {
    const tenant = await this.tenantsService.resolveByApiKey(rawKey);
    if (!tenant) return null;
    return { id: tenant.id, name: tenant.name, webhookUrl: tenant.webhookUrl };
  }
}
```

**Step 7: Crear `internal.module.ts` y agregar al AppModule**

```typescript
import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { DocumentTypesModule } from '../document-types/document-types.module';
import { TenantsModule } from '../tenants/tenants.module';
import { PromptBuilderService } from '../prompt/prompt-builder.service';

@Module({
  imports: [DocumentTypesModule, TenantsModule],
  controllers: [InternalController],
  providers: [PromptBuilderService],
})
export class InternalModule {}
```

**Step 8: Commit**

```bash
git add services/registry
git commit -m "feat: registry PromptBuilder + internal API for core"
```

---

## Task 9: Scaffold NestJS `core` service

**Files:**
- Create: `services/core/package.json`
- Create: `services/core/tsconfig.json`
- Create: `services/core/src/main.ts`
- Create: `services/core/src/app.module.ts`
- Create: `services/core/src/database/` (modelos Document, ExtractionResult)

**Step 1: Crear `services/core/package.json`**

```json
{
  "name": "@docproc/core",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/sequelize": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "sequelize": "^6.37.0",
    "sequelize-typescript": "^2.1.0",
    "pg": "^8.13.0",
    "pg-hstore": "^2.3.4",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "multer": "^1.4.5",
    "@anthropic-ai/sdk": "^0.52.0",
    "axios": "^1.7.0",
    "@docproc/api-contracts": "workspace:*",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@docproc/typescript-config": "workspace:*",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/multer": "^1.4.0",
    "@types/uuid": "^10.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^22.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Crear modelos DB del core**

`src/database/models/document.model.ts`:

```typescript
import { Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { ExtractionField } from './extraction-field.model';

export type DocumentStatus = 'pending' | 'processing' | 'processed' | 'confirmed' | 'rejected' | 'error';

@Table({ tableName: 'documents', timestamps: true })
export class Document extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  declare tenantId: string;

  @Column({ type: DataType.UUID, allowNull: false })
  declare documentTypeId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare status: DocumentStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare fileUrl: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare aiModelUsed: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare inputTokens: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare outputTokens: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare errorMessage: string | null;

  @HasMany(() => ExtractionField)
  declare fields: ExtractionField[];
}
```

`src/database/models/extraction-field.model.ts`:

```typescript
import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Document } from './document.model';

@Table({ tableName: 'extraction_fields', timestamps: true })
export class ExtractionField extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Document)
  @Column({ type: DataType.UUID, allowNull: false })
  declare documentId: string;

  @BelongsTo(() => Document)
  declare document: Document;

  @Column({ type: DataType.STRING, allowNull: false })
  declare key: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare value: string | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare confidence: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare corrected: boolean;
}
```

**Step 3: Crear main.ts y app.module.ts del core**

`src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`Core running on port ${port}`);
}
bootstrap();
```

**Step 4: Commit**

```bash
git add services/core
git commit -m "chore: scaffold core NestJS service with DB models"
```

---

## Task 10: Core — RegistryClient + API key auth

**Files:**
- Create: `services/core/src/registry/registry.client.ts`
- Test: `services/core/src/registry/registry.client.spec.ts`
- Create: `services/core/src/auth/api-key.guard.ts`
- Create: `services/core/src/auth/tenant.decorator.ts`

**Step 1: Escribir test del RegistryClient**

`src/registry/registry.client.spec.ts`:

```typescript
import { RegistryClient } from './registry.client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RegistryClient', () => {
  let client: RegistryClient;

  beforeEach(() => {
    process.env.REGISTRY_URL = 'http://registry:3001';
    process.env.INTERNAL_SECRET = 'secret';
    client = new RegistryClient();
  });

  it('resolves tenant by API key', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({
      data: { id: 'tenant1', name: 'Vesprini', webhookUrl: null },
    });
    const tenant = await client.resolveTenant('dp_abc123');
    expect(tenant).toEqual({ id: 'tenant1', name: 'Vesprini', webhookUrl: null });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://registry:3001/internal/tenant/by-api-key/dp_abc123',
      expect.objectContaining({ headers: { 'x-internal-secret': 'secret' } }),
    );
  });

  it('returns null for unknown key', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: null });
    const tenant = await client.resolveTenant('bad_key');
    expect(tenant).toBeNull();
  });
});
```

**Step 2: Implementar `registry.client.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { ResolvedSchema } from '@docproc/api-contracts';

@Injectable()
export class RegistryClient {
  private readonly baseUrl = process.env.REGISTRY_URL ?? 'http://localhost:3001';
  private readonly secret = process.env.INTERNAL_SECRET ?? '';

  private get headers() {
    return { 'x-internal-secret': this.secret };
  }

  async resolveTenant(rawApiKey: string): Promise<{ id: string; name: string; webhookUrl: string | null } | null> {
    const res = await axios.get(`${this.baseUrl}/internal/tenant/by-api-key/${rawApiKey}`, { headers: this.headers });
    return res.data ?? null;
  }

  async resolveSchema(documentTypeId: string): Promise<ResolvedSchema> {
    const res = await axios.get(`${this.baseUrl}/internal/schema/${documentTypeId}`, { headers: this.headers });
    return res.data;
  }
}
```

**Step 3: Crear `api-key.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegistryClient } from '../registry/registry.client';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly registryClient: RegistryClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers['x-api-key'] as string;
    if (!rawKey) throw new UnauthorizedException('Missing X-Api-Key header');
    const tenant = await this.registryClient.resolveTenant(rawKey);
    if (!tenant) throw new UnauthorizedException('Invalid API key');
    (request as any).tenant = tenant;
    return true;
  }
}
```

**Step 4: Crear `tenant.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
```

**Step 5: Correr tests**

```bash
cd services/core && pnpm test registry.client
```
Expected: PASS

**Step 6: Commit**

```bash
git add services/core
git commit -m "feat: core RegistryClient + ApiKeyGuard"
```

---

## Task 11: Core — Extractor service (Claude Vision)

**Files:**
- Create: `services/core/src/extractor/extractor.service.ts`
- Test: `services/core/src/extractor/extractor.service.spec.ts`

**Step 1: Escribir el test**

`src/extractor/extractor.service.spec.ts`:

```typescript
import { ExtractorService } from './extractor.service';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

describe('ExtractorService', () => {
  let service: ExtractorService;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn().mockResolvedValue({
      model: 'claude-sonnet-4-20250514',
      content: [{ type: 'text', text: '{"numero_remito": "12345", "tipo_carga": "congelado"}' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as any));
    service = new ExtractorService();
  });

  it('calls Claude with the prompt and image, returns parsed fields', async () => {
    const result = await service.extract({
      imageBase64: 'base64data',
      mimeType: 'image/jpeg',
      prompt: 'Extrae los campos...',
      model: 'claude-sonnet-4-20250514',
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-sonnet-4-20250514',
    }));
    expect(result.fields).toMatchObject({ numero_remito: '12345', tipo_carga: 'congelado' });
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);
    expect(result.modelUsed).toBe('claude-sonnet-4-20250514');
  });

  it('handles malformed JSON gracefully', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'claude-sonnet-4-20250514',
      content: [{ type: 'text', text: 'No pude extraer los datos' }],
      usage: { input_tokens: 50, output_tokens: 10 },
    });
    const result = await service.extract({
      imageBase64: 'base64data',
      mimeType: 'image/jpeg',
      prompt: 'Extrae...',
      model: 'claude-sonnet-4-20250514',
    });
    expect(result.fields).toEqual({});
    expect(result.parseError).toBeTruthy();
  });
});
```

**Step 2: Correr test — debe fallar**

```bash
pnpm test extractor.service
```

**Step 3: Implementar `extractor.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

interface ExtractionInput {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';
  prompt: string;
  model: string;
}

interface ExtractionOutput {
  fields: Record<string, unknown>;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  parseError?: string;
}

@Injectable()
export class ExtractorService {
  private readonly client = new Anthropic();

  async extract(input: ExtractionInput): Promise<ExtractionOutput> {
    const response = await this.client.messages.create({
      model: input.model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: input.mimeType,
                data: input.imageBase64,
              },
            },
            { type: 'text', text: input.prompt },
          ],
        },
      ],
    });

    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    let fields: Record<string, unknown> = {};
    let parseError: string | undefined;

    try {
      // Extraer JSON aunque haya texto extra
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fields = JSON.parse(jsonMatch[0]);
      } else {
        parseError = 'No JSON found in response';
      }
    } catch (e) {
      parseError = (e as Error).message;
    }

    return {
      fields,
      modelUsed: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      parseError,
    };
  }
}
```

**Step 4: Correr test — debe pasar**

```bash
pnpm test extractor.service
```
Expected: PASS — 2 tests passed

**Step 5: Commit**

```bash
git add services/core
git commit -m "feat: core ExtractorService (Claude Vision)"
```

---

## Task 12: Core — módulo Documents (upload + review workflow)

**Files:**
- Create: `services/core/src/documents/documents.module.ts`
- Create: `services/core/src/documents/documents.service.ts`
- Create: `services/core/src/documents/documents.controller.ts`
- Create: `services/core/src/documents/dto/*.dto.ts`
- Test: `services/core/src/documents/documents.service.spec.ts`

**Step 1: Crear DTOs**

`src/documents/dto/upload-document.dto.ts`:

```typescript
import { IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @IsUUID()
  documentTypeId: string;
}
```

`src/documents/dto/patch-fields.dto.ts`:

```typescript
import { IsObject } from 'class-validator';

export class PatchFieldsDto {
  @IsObject()
  fields: Record<string, string | null>;
}
```

**Step 2: Implementar `documents.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Document } from '../database/models/document.model';
import { ExtractionField } from '../database/models/extraction-field.model';
import { ExtractorService } from '../extractor/extractor.service';
import { RegistryClient } from '../registry/registry.client';
import { PatchFieldsDto } from './dto/patch-fields.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document) private readonly docModel: typeof Document,
    @InjectModel(ExtractionField) private readonly fieldModel: typeof ExtractionField,
    private readonly extractor: ExtractorService,
    private readonly registry: RegistryClient,
  ) {}

  async create(tenantId: string, documentTypeId: string, fileBuffer: Buffer, mimeType: string): Promise<Document> {
    const doc = await this.docModel.create({
      tenantId,
      documentTypeId,
      status: 'processing',
    });

    // Proceso en background (fire-and-forget) para responder rápido
    this.processDocument(doc.id, documentTypeId, fileBuffer, mimeType as any).catch((e) => {
      console.error(`Error processing document ${doc.id}:`, e);
    });

    return doc;
  }

  private async processDocument(
    docId: string,
    documentTypeId: string,
    fileBuffer: Buffer,
    mimeType: any,
  ) {
    const doc = await this.docModel.findByPk(docId);
    if (!doc) return;

    try {
      const schema = await this.registry.resolveSchema(documentTypeId);
      const imageBase64 = fileBuffer.toString('base64');
      const result = await this.extractor.extract({
        imageBase64,
        mimeType,
        prompt: schema.prompt,
        model: schema.model,
      });

      // Guardar campos extraídos
      const fieldEntries = schema.fields.map((f) => ({
        documentId: docId,
        key: f.key,
        value: result.fields[f.key] != null ? String(result.fields[f.key]) : null,
        confidence: null,
        corrected: false,
      }));
      await this.fieldModel.bulkCreate(fieldEntries);

      await doc.update({
        status: result.parseError ? 'error' : 'processed',
        aiModelUsed: result.modelUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        errorMessage: result.parseError ?? null,
      });
    } catch (e) {
      await doc.update({ status: 'error', errorMessage: (e as Error).message });
    }
  }

  async findById(id: string, tenantId: string): Promise<Document> {
    const doc = await this.docModel.findOne({
      where: { id, tenantId },
      include: [ExtractionField],
    });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async findByTenant(tenantId: string): Promise<Document[]> {
    return this.docModel.findAll({
      where: { tenantId },
      include: [ExtractionField],
      order: [['createdAt', 'DESC']],
    });
  }

  async patchFields(id: string, tenantId: string, dto: PatchFieldsDto): Promise<Document> {
    const doc = await this.findById(id, tenantId);
    await Promise.all(
      Object.entries(dto.fields).map(([key, value]) =>
        this.fieldModel.update({ value, corrected: true }, { where: { documentId: id, key } }),
      ),
    );
    return this.findById(id, tenantId);
  }

  async confirm(id: string, tenantId: string): Promise<Document> {
    const doc = await this.findById(id, tenantId);
    return doc.update({ status: 'confirmed' });
  }

  async reject(id: string, tenantId: string): Promise<Document> {
    const doc = await this.findById(id, tenantId);
    return doc.update({ status: 'rejected', errorMessage: null });
  }
}
```

**Step 3: Crear `documents.controller.ts`**

```typescript
import {
  Body, Controller, Get, Param, Patch, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentTenant } from '../auth/tenant.decorator';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { PatchFieldsDto } from './dto/patch-fields.dto';

@Controller('documents')
@UseGuards(ApiKeyGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.create(tenant.id, dto.documentTypeId, file.buffer, file.mimetype);
  }

  @Get()
  findAll(@CurrentTenant() tenant: { id: string }) {
    return this.service.findByTenant(tenant.id);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.service.findById(id, tenant.id);
  }

  @Patch(':id/fields')
  patchFields(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() dto: PatchFieldsDto,
  ) {
    return this.service.patchFields(id, tenant.id, dto);
  }

  @Post(':id/confirm')
  confirm(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.service.confirm(id, tenant.id);
  }

  @Post(':id/reject')
  reject(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.service.reject(id, tenant.id);
  }
}
```

**Step 4: Crear `documents.module.ts` y conectar en AppModule**

```typescript
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Document } from '../database/models/document.model';
import { ExtractionField } from '../database/models/extraction-field.model';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ExtractorService } from '../extractor/extractor.service';
import { RegistryClient } from '../registry/registry.client';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Module({
  imports: [SequelizeModule.forFeature([Document, ExtractionField])],
  controllers: [DocumentsController],
  providers: [DocumentsService, ExtractorService, RegistryClient, ApiKeyGuard],
})
export class DocumentsModule {}
```

**Step 5: Verificar build**

```bash
cd services/core && pnpm build
```
Expected: BUILD OK

**Step 6: Commit**

```bash
git add services/core
git commit -m "feat: core Documents module (upload + extraction + review workflow)"
```

---

## Task 13: docker-compose para dev local

**Files:**
- Create: `docker-compose.yml` (raíz del monorepo)
- Create: `services/registry/.env.example`
- Create: `services/core/.env.example`

**Step 1: Crear `docker-compose.yml`**

```yaml
version: '3.9'

services:
  postgres-registry:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: docproc_registry
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - pgdata-registry:/var/lib/postgresql/data

  postgres-core:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: docproc_core
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5434:5432"
    volumes:
      - pgdata-core:/var/lib/postgresql/data

  registry:
    build:
      context: ./services/registry
      dockerfile: Dockerfile
    env_file: ./services/registry/.env
    ports:
      - "3001:3001"
    depends_on:
      - postgres-registry

  core:
    build:
      context: ./services/core
      dockerfile: Dockerfile
    env_file: ./services/core/.env
    ports:
      - "3002:3002"
    depends_on:
      - postgres-core
      - registry

volumes:
  pgdata-registry:
  pgdata-core:
```

**Step 2: Crear `.env.example` del registry**

```
DATABASE_URL=postgres://postgres:postgres@postgres-registry:5432/docproc_registry
PORT=3001
INTERNAL_SECRET=change-me-in-production
```

**Step 3: Crear `.env.example` del core**

```
DATABASE_URL=postgres://postgres:postgres@postgres-core:5432/docproc_core
PORT=3002
REGISTRY_URL=http://registry:3001
INTERNAL_SECRET=change-me-in-production
ANTHROPIC_API_KEY=sk-ant-...
```

**Step 4: Crear Dockerfiles básicos para cada servicio**

`services/registry/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main"]
```

(Mismo para core, con `EXPOSE 3002`)

**Step 5: Commit**

```bash
git add docker-compose.yml services/registry/Dockerfile services/core/Dockerfile services/**/.env.example
git commit -m "chore: add docker-compose + Dockerfiles for local dev"
```

---

## Task 14: Smoke test end-to-end (manual)

Verificar que el flujo completo funciona con los dos servicios corriendo.

**Step 1: Levantar DBs**

```bash
docker-compose up -d postgres-registry postgres-core
```

**Step 2: Levantar registry en modo dev**

```bash
cd services/registry
cp .env.example .env  # Editar INTERNAL_SECRET
pnpm dev
```
Expected: "Registry running on port 3001"

**Step 3: Crear tenant en registry**

```bash
curl -X POST http://localhost:3001/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Vesprini Test"}'
```
Expected: `{"id": "...", "name": "Vesprini Test", "apiKey": "dp_...", "webhookUrl": null}`

**Step 4: Crear tipo de documento**

```bash
curl -X POST http://localhost:3001/document-types \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<id-del-paso-3>", "name": "Remito", "model": "claude-haiku-4-5-20251001"}'
```

**Step 5: Agregar campos**

```bash
curl -X POST http://localhost:3001/document-types/<docTypeId>/fields \
  -H "Content-Type: application/json" \
  -d '{"key":"numero_remito","label":"N° Remito","type":"text","description":"Número en la parte superior del documento","required":true,"order":0}'
```

**Step 6: Ver prompt auto-generado**

```bash
curl -H "x-internal-secret: <secret>" \
  http://localhost:3001/internal/schema/<docTypeId>
```
Expected: JSON con `prompt` construido desde los campos

**Step 7: Levantar core**

```bash
cd services/core
cp .env.example .env  # Editar ANTHROPIC_API_KEY, INTERNAL_SECRET igual al registry
pnpm dev
```
Expected: "Core running on port 3002"

**Step 8: Subir documento**

```bash
curl -X POST http://localhost:3002/v1/documents \
  -H "X-Api-Key: dp_<api-key>" \
  -F "file=@/path/to/remito.jpg" \
  -F "documentTypeId=<docTypeId>"
```
Expected: `{"id": "...", "status": "processing", ...}`

**Step 9: Verificar extracción**

```bash
curl -H "X-Api-Key: dp_<api-key>" \
  http://localhost:3002/v1/documents/<docId>
```
Expected: `{"status": "processed", "fields": [...], ...}`

**Step 10: Confirmar**

```bash
curl -X POST -H "X-Api-Key: dp_<api-key>" \
  http://localhost:3002/v1/documents/<docId>/confirm
```

---

## Próximos pasos (Phase 2 — no en este plan)

- [ ] Admin UI en Next.js (en `services/registry/src/ui/`)
- [ ] Review UI embebible con JWT de un solo uso
- [ ] Webhooks: dispatch POST al webhookUrl del tenant en cambios de estado
- [ ] Migración de Vesprini POC → primer tenant en docproc
- [ ] CI/CD (GitHub Actions)
- [ ] Migraciones de DB formales (Sequelize CLI en lugar de `synchronize: true`)
