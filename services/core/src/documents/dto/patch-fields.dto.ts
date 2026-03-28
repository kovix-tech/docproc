import { IsObject } from 'class-validator';

export class PatchFieldsDto {
  @IsObject()
  fields!: Record<string, string | null>;
}
