import { Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { ExtractionField } from './extraction-field.model';

export type DocumentStatus = 'pending' | 'processing' | 'processed' | 'confirmed' | 'rejected' | 'error';

@Table({ tableName: 'documents', timestamps: true })
export class Document extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  declare tenantId: string;

  @Column({ type: DataType.UUID, allowNull: false })
  declare documentTypeId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare status: DocumentStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare fileUrl: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare aiModelUsed: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare inputTokens: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare outputTokens: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare errorMessage: string | null;

  @HasMany(() => ExtractionField)
  declare fields: ExtractionField[];
}
