import {
  Column, DataType, Default, HasMany,
  Model, PrimaryKey, Table, Unique,
} from 'sequelize-typescript';
import { DocumentType } from './document-type.model';

@Table({ tableName: 'tenants', timestamps: true })
export class Tenant extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  // Almacenamos el hash SHA-256 de la API key
  @Unique
  @Column({ type: DataType.STRING, allowNull: false })
  declare apiKeyHash: string;

  // Solo devuelta una vez al crear (no se persiste en claro)
  @Column({ type: DataType.STRING, allowNull: true })
  declare webhookUrl: string | null;

  @HasMany(() => DocumentType)
  declare documentTypes: DocumentType[];
}
