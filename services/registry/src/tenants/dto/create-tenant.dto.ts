import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;
}
