import { IsArray, IsString } from 'class-validator';

export class ReorderFieldsDto {
  @IsArray()
  @IsString({ each: true })
  fieldIds!: string[]; // Orden deseado de IDs
}
