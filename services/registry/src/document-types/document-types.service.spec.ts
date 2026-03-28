import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DocumentTypesService } from './document-types.service';
import { DocumentType } from '../database/models/document-type.model';
import { FieldSchema } from '../database/models/field-schema.model';

const mockDocType = {
  id: 'dt1',
  tenantId: 'tenant1',
  name: 'Remito',
  promptOverride: null,
  model: 'claude-sonnet-4-20250514',
  active: true,
  fields: [],
};

const mockDocTypeModel = {
  create: jest.fn().mockResolvedValue(mockDocType),
  findAll: jest.fn().mockResolvedValue([mockDocType]),
  findByPk: jest.fn().mockResolvedValue({ ...mockDocType, fields: [] }),
};

const mockFieldSchemaModel = {
  create: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn(),
};

describe('DocumentTypesService', () => {
  let service: DocumentTypesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentTypesService,
        { provide: getModelToken(DocumentType), useValue: mockDocTypeModel },
        { provide: getModelToken(FieldSchema), useValue: mockFieldSchemaModel },
      ],
    }).compile();
    service = module.get(DocumentTypesService);
  });

  it('creates a document type', async () => {
    const result = await service.create({ tenantId: 'tenant1', name: 'Remito' });
    expect(result.name).toBe('Remito');
    expect(mockDocTypeModel.create).toHaveBeenCalled();
  });

  it('finds document types by tenant', async () => {
    const result = await service.findByTenant('tenant1');
    expect(result).toHaveLength(1);
  });
});
