import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AIModel } from '@docproc/api-contracts';

const AI_MODELS = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-20250514'] as const;

export class CreateDocumentTypeDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  promptOverride?: string;

  @IsEnum(AI_MODELS)
  @IsOptional()
  model?: AIModel;
}
