import {
  BelongsTo, Column, DataType, Default,
  ForeignKey, HasMany, Model, PrimaryKey, Table,
} from 'sequelize-typescript';
import type { AIModel } from '@docproc/api-contracts';
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
  declare model: AIModel;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare active: boolean;

  @HasMany(() => FieldSchema)
  declare fields: FieldSchema[];
}
