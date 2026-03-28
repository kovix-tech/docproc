import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Document } from './document.model';

@Table({ tableName: 'extraction_fields', timestamps: true })
export class ExtractionField extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Document)
  @Column({ type: DataType.UUID, allowNull: false })
  declare documentId: string;

  @BelongsTo(() => Document)
  declare document: Document;

  @Column({ type: DataType.STRING, allowNull: false })
  declare key: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare value: string | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare confidence: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare corrected: boolean;
}
