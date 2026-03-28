import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

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

  @ValidateIf((o) => o.type === 'enum')
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  enumOptions?: string[];

  @IsInt()
  @Min(0)
  order!: number;
}
