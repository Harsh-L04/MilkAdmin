import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CatalogService } from '../src/catalog/catalog.service';

vi.mock('@moderns-milk/database', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, opts: { code: string }) {
        super(message);
        this.code = opts.code;
        this.name = 'PrismaClientKnownRequestError';
      }
    },
  },
}));

const mockPrisma = {
  product: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CatalogService(mockPrisma as any);
  });

  describe('listProducts', () => {
    it('returns active products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Full Cream Milk', sku: 'FCM001', category: 'MILK', uom: 'LITRE', packSize: '1', taxRate: '5', hsnCode: null, shelfLifeDays: null, isReturnablePack: false, active: true, orderUnit: 'UNIT', minOrderQty: null, maxOrderQty: null, unitPrice: null },
      ]);

      const result = await service.listProducts({});
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Full Cream Milk');
    });

    it('filters by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      await service.listProducts({ category: 'DAIRY' });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'DAIRY' }),
        }),
      );
    });

    it('defaults active to true when not specified', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      await service.listProducts({});
      const call = mockPrisma.product.findMany.mock.calls[0][0];
      expect(call.where.active).toBe(true);
    });

    it('respects search via active filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      await service.listProducts({ active: false });
      const call = mockPrisma.product.findMany.mock.calls[0][0];
      expect(call.where.active).toBe(false);
    });
  });

  describe('createProduct', () => {
    const input = {
      sku: 'FCM001',
      name: 'Full Cream Milk',
      category: 'MILK' as const,
      uom: 'LITRE' as const,
      packSize: '1',
      taxRate: '5',
      isReturnablePack: false,
      active: true,
      orderUnit: 'UNIT' as const,
    };

    it('creates product with proper data', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({
        id: 'p1',
        ...input,
        hsnCode: null,
        shelfLifeDays: null,
        minOrderQty: null,
        maxOrderQty: null,
        unitPrice: null,
      });

      const result = await service.createProduct(input);
      expect(result.id).toBe('p1');
    });

    it('throws ConflictException when name already exists', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.createProduct(input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException on unique constraint violation', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      const { Prisma } = require('@moderns-milk/database');
      mockPrisma.product.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002' }),
      );
      await expect(service.createProduct(input)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateProduct', () => {
    it('updates product fields', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.update.mockResolvedValue({
        id: 'p1',
        sku: 'FCM001',
        name: 'Updated Milk',
        category: 'MILK',
        uom: 'LITRE',
        packSize: '1',
        taxRate: '5',
        hsnCode: null,
        shelfLifeDays: null,
        isReturnablePack: false,
        active: true,
        orderUnit: 'UNIT',
        minOrderQty: null,
        maxOrderQty: null,
        unitPrice: null,
      });

      const result = await service.updateProduct('p1', { name: 'Updated Milk' });
      expect(result.name).toBe('Updated Milk');
    });

    it('throws NotFoundException on P2025 Prisma error', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      const { Prisma } = require('@moderns-milk/database');
      mockPrisma.product.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025' }),
      );
      await expect(
        service.updateProduct('nonexistent', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when name already exists', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'other' });
      await expect(
        service.updateProduct('p1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
