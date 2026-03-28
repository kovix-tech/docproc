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
