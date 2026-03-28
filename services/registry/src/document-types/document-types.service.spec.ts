import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DocumentTypesService } from './document-types.service';
import { DocumentType } from '../database/models/document-type.model';
import { FieldSchema } from '../database/models/field-schema.model';
import { PromptBuilderService } from '../prompt/prompt-builder.service';

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
        {
          provide: PromptBuilderService,
          useValue: {
            build: jest.fn().mockReturnValue('generated prompt'),
            buildOrOverride: jest.fn().mockImplementation(
              (_, override) => override ?? 'generated prompt',
            ),
          },
        },
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

  describe('getPromptPreview', () => {
    it('returns auto-generated prompt when no override', async () => {
      mockDocTypeModel.findByPk.mockResolvedValue({
        ...mockDocType,
        promptOverride: null,
        fields: [],
      });
      const result = await service.getPromptPreview('dt1');
      expect(result.prompt).toBe('generated prompt');
      expect(result.hasOverride).toBe(false);
    });

    it('returns override prompt when set', async () => {
      mockDocTypeModel.findByPk.mockResolvedValue({
        ...mockDocType,
        promptOverride: 'Custom prompt',
        fields: [],
      });
      const result = await service.getPromptPreview('dt1');
      expect(result.prompt).toBe('Custom prompt');
      expect(result.hasOverride).toBe(true);
    });
  });

  describe('updatePromptOverride', () => {
    it('calls update with the given override', async () => {
      const mockInstance = { update: jest.fn().mockResolvedValue(undefined) };
      mockDocTypeModel.findByPk.mockResolvedValue(mockInstance);
      await service.updatePromptOverride('dt1', 'Custom prompt');
      expect(mockInstance.update).toHaveBeenCalledWith({ promptOverride: 'Custom prompt' });
    });

    it('calls update with null to clear override', async () => {
      const mockInstance = { update: jest.fn().mockResolvedValue(undefined) };
      mockDocTypeModel.findByPk.mockResolvedValue(mockInstance);
      await service.updatePromptOverride('dt1', null);
      expect(mockInstance.update).toHaveBeenCalledWith({ promptOverride: null });
    });
  });
});
