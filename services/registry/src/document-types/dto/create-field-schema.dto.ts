import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class CreateFieldSchemaDto {
  @IsString()
  key!: string;

  @IsString()
  label!: string;

  @IsEnum(['text', 'number', 'date', 'enum', 'boolean'])
  type!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  required!: boolean;

  @IsArray()
  @IsString({ each: true })
  @ValidateIf((o) => o.type === 'enum')
  enumOptions?: string[];

  @IsInt()
  @Min(0)
  order!: number;
}
