import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Document } from './models/document.model';
import { ExtractionField } from './models/extraction-field.model';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      uri: process.env.DATABASE_URL,
      models: [Document, ExtractionField],
      autoLoadModels: true,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: false,
    }),
  ],
})
export class DatabaseModule {}
