import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../src/report/report.service';

const mockPrisma = {
  orderItem: { findMany: vi.fn() },
};

const adminUser = { userId: 'u1', role: 'ADMIN' as const };
const distUser = { userId: 'u2', role: 'DISTRIBUTOR' as const, distributorId: 'd1' };
const salesHeadUser = { userId: 'u3', role: 'SALES_HEAD' as const };

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportService(mockPrisma as any);
  });

  describe('orderSummary', () => {
    it('calculates daily summary from order items', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          qtyOrdered: '100',
          qtyApproved: '100',
          product: { id: 'p1', name: 'Full Cream Milk', uom: 'LITRE' },
          order: { distributor: { region: 'North' } },
        },
        {
          qtyOrdered: '50',
          qtyApproved: null,
          product: { id: 'p2', name: 'Toned Milk', uom: 'LITRE' },
          order: { distributor: { region: 'South' } },
        },
      ]);

      const result = await service.orderSummary(adminUser, '2026-06-26');
      expect(result.date).toBe('2026-06-26');
      expect(result.rows).toHaveLength(2);
      expect(result.areas).toContain('North');
      expect(result.areas).toContain('South');
    });

    it('uses qtyApproved when set, otherwise qtyOrdered', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          qtyOrdered: '100',
          qtyApproved: '80',
          product: { id: 'p1', name: 'Milk', uom: 'LITRE' },
          order: { distributor: { region: 'North' } },
        },
      ]);

      const result = await service.orderSummary(adminUser, '2026-06-26');
      expect(result.rows[0].total).toBe('80');
    });

    it('filters by distributor scope for non-admin roles', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      await service.orderSummary(distUser, '2026-06-26');
      const call = mockPrisma.orderItem.findMany.mock.calls[0][0];
      expect(call.where.order.distributorId).toBe('d1');
    });

    it('does not filter by distributor for SALES_HEAD', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      await service.orderSummary(salesHeadUser, '2026-06-26');
      const call = mockPrisma.orderItem.findMany.mock.calls[0][0];
      expect(call.where.order.distributorId).toBeUndefined();
    });

    it('returns empty summary when no data', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      const result = await service.orderSummary(adminUser, '2026-06-26');
      expect(result.rows).toHaveLength(0);
      expect(result.areas).toHaveLength(0);
    });

    it('excludes DRAFT and CANCELLED orders', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      await service.orderSummary(adminUser, '2026-06-26');
      const call = mockPrisma.orderItem.findMany.mock.calls[0][0];
      expect(call.where.order.status.notIn).toContain('DRAFT');
      expect(call.where.order.status.notIn).toContain('CANCELLED');
    });

    it('handles null region by labeling Unassigned', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          qtyOrdered: '100',
          qtyApproved: null,
          product: { id: 'p1', name: 'Milk', uom: 'LITRE' },
          order: { distributor: { region: null } },
        },
      ]);
      const result = await service.orderSummary(adminUser, '2026-06-26');
      expect(result.areas).toContain('Unassigned');
    });
  });
});
