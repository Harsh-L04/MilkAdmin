import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentService } from '../src/payment/payment.service';

const mockPrisma = {
  distributor: { findUnique: vi.fn() },
  paymentLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const adminUser = { userId: 'u1', role: 'ADMIN' as const };
const distUser = { userId: 'u2', role: 'DISTRIBUTOR' as const, distributorId: 'd1' };
const distUserNoScope = { userId: 'u3', role: 'DISTRIBUTOR' as const };
const salesOffUser = { userId: 'u4', role: 'SALES_OFFICER' as const, distributorId: 'd1' };
const salesHeadUser = { userId: 'u5', role: 'SALES_HEAD' as const };

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentService(mockPrisma as any);
  });

  describe('create', () => {
    const input = {
      amount: '1000',
      paymentDate: '2026-06-26',
      mode: 'CASH' as const,
    };

    it('creates payment for distributor user', async () => {
      mockPrisma.distributor.findUnique.mockResolvedValue({ id: 'd1', name: 'Dist A' });
      mockPrisma.paymentLog.create.mockResolvedValue({
        id: 'p1',
        distributorId: 'd1',
        orderId: null,
        amount: { toString: () => '1000' },
        paymentDate: new Date('2026-06-26'),
        mode: 'CASH',
        status: 'PENDING',
        proofImageKey: null,
        note: null,
        distributor: { name: 'Dist A' },
        recordedBy: { name: 'Admin' },
        createdAt: new Date(),
      });

      const result = await service.create(distUser, input);
      expect(result.id).toBe('p1');
    });

    it('creates payment for staff on behalf of distributor', async () => {
      mockPrisma.distributor.findUnique.mockResolvedValue({ id: 'd1', name: 'Dist A' });
      mockPrisma.paymentLog.create.mockResolvedValue({
        id: 'p1',
        distributorId: 'd1',
        orderId: null,
        amount: { toString: () => '1000' },
        paymentDate: new Date('2026-06-26'),
        mode: 'CASH',
        status: 'PENDING',
        proofImageKey: null,
        note: null,
        distributor: { name: 'Dist A' },
        recordedBy: { name: 'Staff' },
        createdAt: new Date(),
      });

      const result = await service.create(adminUser, { ...input, distributorId: 'd1' });
      expect(result.id).toBe('p1');
    });

    it('throws when staff does not specify distributorId', async () => {
      await expect(service.create(adminUser, input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when distributor not found', async () => {
      mockPrisma.distributor.findUnique.mockResolvedValue(null);
      await expect(
        service.create(distUser, input),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when distributor user has no distributorId', async () => {
      await expect(
        service.create(distUserNoScope, input),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('list', () => {
    it('ADMIN sees all payments', async () => {
      mockPrisma.paymentLog.findMany.mockResolvedValue([]);
      await service.list(adminUser, {});
      const call = mockPrisma.paymentLog.findMany.mock.calls[0][0];
      expect(call.where).toEqual({});
    });

    it('DISTRIBUTOR sees own payments', async () => {
      mockPrisma.paymentLog.findMany.mockResolvedValue([]);
      await service.list(distUser, {});
      const call = mockPrisma.paymentLog.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ distributorId: 'd1' });
    });

    it('filters by status', async () => {
      mockPrisma.paymentLog.findMany.mockResolvedValue([]);
      await service.list(adminUser, { status: 'PAID' });
      const call = mockPrisma.paymentLog.findMany.mock.calls[0][0];
      expect(call.where.status).toBe('PAID');
    });

    it('ignores unknown status filter', async () => {
      mockPrisma.paymentLog.findMany.mockResolvedValue([]);
      await service.list(adminUser, { status: 'UNKNOWN' as any });
      const call = mockPrisma.paymentLog.findMany.mock.calls[0][0];
      expect(call.where.status).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('updates PENDING to PAID', async () => {
      mockPrisma.paymentLog.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.paymentLog.update.mockResolvedValue({
        id: 'p1',
        distributorId: 'd1',
        orderId: null,
        amount: { toString: () => '1000' },
        paymentDate: new Date(),
        mode: 'CASH',
        status: 'PAID',
        proofImageKey: null,
        note: null,
        distributor: { name: 'Dist A' },
        recordedBy: { name: 'Admin' },
        createdAt: new Date(),
      });

      const result = await service.updateStatus('p1', { status: 'PAID' });
      expect(result.status).toBe('PAID');
    });

    it('throws NotFoundException when payment not found', async () => {
      mockPrisma.paymentLog.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('p1', { status: 'PAID' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
