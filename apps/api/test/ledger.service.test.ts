import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LedgerService } from '../src/ledger/ledger.service';

const mockPrisma = {
  retailerAccount: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  ledgerEntry: { create: vi.fn(), findMany: vi.fn() },
  retailer: { findUnique: vi.fn() },
};

const mockTx = {
  retailerAccount: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  ledgerEntry: { create: vi.fn() },
};

const adminUser = {
  userId: 'u1',
  role: 'ADMIN' as const,
};

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LedgerService(mockPrisma as any);
  });

  describe('postWithinTx', () => {
    it('posts a DEBIT and increases balance', async () => {
      mockTx.retailerAccount.findUnique.mockResolvedValue({
        retailerId: 'r1',
        balance: { add: vi.fn(() => ({ toNumber: () => 1500 })) },
        creditLimit: '20000',
      });
      const balance = { add: vi.fn().mockReturnValue({ toNumber: () => 1500 }) };
      mockTx.retailerAccount.findUnique.mockResolvedValue({
        retailerId: 'r1',
        balance,
        creditLimit: '20000',
      });
      mockTx.retailerAccount.update.mockResolvedValue({});

      const mockDecimal = {
        add: vi.fn().mockReturnThis(),
        sub: vi.fn().mockReturnThis(),
        mul: vi.fn().mockReturnThis(),
        div: vi.fn().mockReturnThis(),
        toNumber: vi.fn().mockReturnValue(500),
      };

      mockTx.retailerAccount.findUnique.mockResolvedValue({
        retailerId: 'r1',
        balance: { add: vi.fn().mockReturnValue(mockDecimal) },
        creditLimit: '20000',
      });
      mockTx.ledgerEntry.create.mockResolvedValue({});

      const result = await service.postWithinTx(
        mockTx as any,
        'r1',
        'DEBIT',
        '500',
        'ORDER',
        'o1',
        'Order O1',
      );
      expect(mockTx.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retailerId: 'r1',
            type: 'DEBIT',
            refType: 'ORDER',
            refId: 'o1',
          }),
        }),
      );
      expect(mockTx.retailerAccount.update).toHaveBeenCalled();
    });

    it('creates account if not exists', async () => {
      mockTx.retailerAccount.findUnique.mockResolvedValue(null);
      mockTx.retailerAccount.create.mockResolvedValue({
        retailerId: 'r1',
        balance: { add: vi.fn().mockReturnValue({ toNumber: () => 500 }) },
        creditLimit: '20000',
      });

      const mockDecimal = {
        add: vi.fn().mockReturnThis(),
        sub: vi.fn().mockReturnThis(),
        mul: vi.fn().mockReturnThis(),
        div: vi.fn().mockReturnThis(),
        toNumber: vi.fn().mockReturnValue(500),
      };

      mockTx.retailerAccount.findUnique.mockResolvedValueOnce(null);
      mockTx.retailerAccount.create.mockResolvedValueOnce({
        retailerId: 'r1',
        balance: { add: vi.fn().mockReturnValue(mockDecimal) },
        creditLimit: '20000',
      });
      mockTx.ledgerEntry.create.mockResolvedValue({});

      await service.postWithinTx(
        mockTx as any,
        'r1',
        'DEBIT',
        '500',
        'ORDER',
        'o1',
      );
      expect(mockTx.retailerAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retailerId: 'r1',
            balance: '0',
            creditLimit: '0',
          }),
        }),
      );
    });

    it('posts a CREDIT and decreases balance', async () => {
      const mockDecimal = {
        sub: vi.fn().mockReturnThis(),
        add: vi.fn().mockReturnThis(),
        mul: vi.fn().mockReturnThis(),
        div: vi.fn().mockReturnThis(),
        toNumber: vi.fn().mockReturnValue(-500),
      };
      const balance = { sub: vi.fn().mockReturnValue(mockDecimal) };
      mockTx.retailerAccount.findUnique.mockResolvedValue({
        retailerId: 'r1',
        balance,
        creditLimit: '20000',
      });
      mockTx.ledgerEntry.create.mockResolvedValue({});
      mockTx.retailerAccount.update.mockResolvedValue({});

      await service.postWithinTx(
        mockTx as any,
        'r1',
        'CREDIT',
        '500',
        'PAYMENT',
        null,
      );
      expect(mockTx.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'CREDIT' }),
        }),
      );
    });
  });

  describe('getLedger', () => {
    it('returns account and entries', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        shopName: 'Test Shop',
        distributorId: 'd1',
      });
      mockPrisma.retailerAccount.findUnique.mockResolvedValue({
        balance: { toNumber: () => 1000, toString: () => '1000' },
        creditLimit: { toNumber: () => 5000, toString: () => '5000' },
      });
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([
        {
          id: 'e1',
          type: 'DEBIT',
          amount: { toString: () => '500' },
          refType: 'ORDER',
          refId: 'o1',
          balanceAfter: { toString: () => '1000' },
          note: null,
          createdAt: new Date('2026-06-26T08:00:00Z'),
        },
      ]);

      const result = await service.getLedger(adminUser, 'r1');
      expect(result.outletName).toBe('Test Shop');
      expect(result.entries).toHaveLength(1);
    });

    it('throws NotFoundException when outlet not found', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue(null);
      await expect(service.getLedger(adminUser, 'r1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when out of scope', async () => {
      const distUser = {
        userId: 'u1',
        role: 'DISTRIBUTOR' as const,
        distributorId: 'd1',
      };
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        shopName: 'Test',
        distributorId: 'd2',
      });
      await expect(service.getLedger(distUser as any, 'r1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('recordCollection', () => {
    it('posts CREDIT and returns ledger', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        shopName: 'Test Shop',
        distributorId: 'd1',
      });
      mockPrisma.retailerAccount.findUnique.mockResolvedValue({
        balance: { toString: () => '500', toNumber: () => 500 },
        creditLimit: { toString: () => '5000', toNumber: () => 5000 },
      });
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([]);
      mockPrisma.$transaction = vi.fn((cb) => cb(mockTx));
      mockTx.retailerAccount.findUnique.mockResolvedValue({
        retailerId: 'r1',
        balance: { sub: vi.fn().mockReturnValue({ toNumber: () => 0 }) },
        creditLimit: '20000',
      });
      mockTx.ledgerEntry.create.mockResolvedValue({});
      mockTx.retailerAccount.update.mockResolvedValue({});

      const result = await service.recordCollection(adminUser, {
        retailerId: 'r1',
        amount: '500',
        mode: 'CASH',
      });
      expect(result.outletName).toBe('Test Shop');
    });

    it('throws NotFoundException when outlet not found', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue(null);
      await expect(
        service.recordCollection(adminUser, {
          retailerId: 'r1',
          amount: '500',
          mode: 'CASH',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
