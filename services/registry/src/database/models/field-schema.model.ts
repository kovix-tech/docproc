import {
  BelongsTo, Column, DataType, Default,
  ForeignKey, Model, PrimaryKey, Table,
} from 'sequelize-typescript';
import type { FieldType } from '@docproc/api-contracts';
import { DocumentType } from './document-type.model';

@Table({ tableName: 'field_schemas', timestamps: true })
export class FieldSchema extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => DocumentType)
  @Column({ type: DataType.UUID, allowNull: false })
  declare documentTypeId: string;

  @BelongsTo(() => DocumentType)
  declare documentType: DocumentType;

  @Column({ type: DataType.STRING, allowNull: false })
  declare key: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare label: string;

  @Column({ type: DataType.ENUM('text', 'number', 'date', 'enum', 'boolean'), allowNull: false })
  declare type: FieldType;

  @Column({ type: DataType.TEXT, allowNull: false, defaultValue: '' })
  declare description: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare required: boolean;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare enumOptions: string[] | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare order: number;
}
