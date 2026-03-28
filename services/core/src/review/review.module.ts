import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SequelizeModule } from '@nestjs/sequelize';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { Document } from '../database/models/document.model';
import { ExtractionField } from '../database/models/extraction-field.model';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { RegistryClient } from '../registry/registry.client';
import { StorageModule } from '../storage/storage.module';
import { FilesController } from './files.controller';
import { JwtReviewService } from './jwt-review.service';
import { ReviewController } from './review.controller';
import { ReviewTokenGuard } from './review-token.guard';

@Module({
  imports: [
    SequelizeModule.forFeature([Document, ExtractionField]),
    JwtModule.register({
      secret: process.env.REVIEW_JWT_SECRET || 'change-me-in-production',
      signOptions: { expiresIn: '15m' },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'review', 'out'),
      serveRoot: '/review',
      exclude: ['/v1(.*)'],
    }),
    StorageModule,
  ],
  controllers: [ReviewController, FilesController],
  providers: [JwtReviewService, ReviewTokenGuard, RegistryClient, ApiKeyGuard],
})
export class ReviewModule {}
