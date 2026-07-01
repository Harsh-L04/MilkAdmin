import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { StandingGeneratorService } from '../src/standing/standing-generator.service';

const mockPrisma = {
  orderWindow: { findUnique: vi.fn(), findMany: vi.fn() },
  standingOrder: { findMany: vi.fn() },
  order: { findFirst: vi.fn() },
};

const mockRedis = {
  del: vi.fn(),
  raw: {
    set: vi.fn(),
    del: vi.fn(),
  },
};

const mockOrdering = {
  createOrderFromLines: vi.fn(),
};

describe('StandingGeneratorService', () => {
  let service: StandingGeneratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T08:00:00Z'));
    service = new StandingGeneratorService(
      mockPrisma as any,
      mockRedis as any,
      mockOrdering as any,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateForWindow', () => {
    const window = {
      id: 'w1',
      distributorId: 'd1',
      status: 'OPEN',
      deliveryDate: new Date('2026-06-27T00:00:00Z'),
      cutoffAt: new Date('2026-06-26T18:00:00Z'),
    };

    it('creates orders for due standings', async () => {
      mockPrisma.orderWindow.findUnique.mockResolvedValue(window);
      mockPrisma.standingOrder.findMany.mockResolvedValue([
        {
          id: 's1',
          retailerId: 'r1',
          active: true,
          weekdayMask: 127,
          items: [{ productId: 'p1', qty: '10' }],
        },
      ]);
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockOrdering.createOrderFromLines.mockResolvedValue({ id: 'o1' });

      const result = await service.generateForWindow('w1');
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('skips when standing order already exists for this window', async () => {
      mockPrisma.orderWindow.findUnique.mockResolvedValue(window);
      mockPrisma.standingOrder.findMany.mockResolvedValue([
        {
          id: 's1',
          retailerId: 'r1',
          active: true,
          weekdayMask: 127,
          items: [{ productId: 'p1', qty: '10' }],
        },
      ]);
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'existing-o1' });

      const result = await service.generateForWindow('w1');
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('skips when standing order has no items', async () => {
      mockPrisma.orderWindow.findUnique.mockResolvedValue(window);
      mockPrisma.standingOrder.findMany.mockResolvedValue([
        {
          id: 's1',
          retailerId: 'r1',
          active: true,
          weekdayMask: 127,
          items: [],
        },
      ]);

      const result = await service.generateForWindow('w1');
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('returns zeros when window is not OPEN', async () => {
      mockPrisma.orderWindow.findUnique.mockResolvedValue({
        ...window,
        status: 'LOCKED',
      });

      const result = await service.generateForWindow('w1');
      expect(result).toEqual({ created: 0, skipped: 0 });
    });

    it('throws NotFoundException when window not found', async () => {
      mockPrisma.orderWindow.findUnique.mockResolvedValue(null);
      await expect(service.generateForWindow('w1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateForAllOpenWindows', () => {
    it('acquires lock and processes windows', async () => {
      mockRedis.raw.set.mockResolvedValue('OK');
      mockPrisma.orderWindow.findMany.mockResolvedValue([]);

      const result = await service.generateForAllOpenWindows();
      expect(result.windowsProcessed).toBe(0);
      expect(mockRedis.del).toHaveBeenCalledWith('lock:standing-generate');
    });

    it('skips when lock is held', async () => {
      mockRedis.raw.set.mockResolvedValue(null);

      const result = await service.generateForAllOpenWindows();
      expect(result).toEqual({ windowsProcessed: 0, created: 0, skipped: 0 });
    });

    it('releases lock even if sweep throws', async () => {
      mockRedis.raw.set.mockResolvedValue('OK');
      mockPrisma.orderWindow.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.generateForAllOpenWindows()).rejects.toThrow();
      expect(mockRedis.del).toHaveBeenCalledWith('lock:standing-generate');
    });
  });

  describe('generateForDistributor', () => {
    it('processes windows for specific distributor', async () => {
      mockPrisma.orderWindow.findMany.mockResolvedValue([]);

      const result = await service.generateForDistributor('d1');
      expect(mockPrisma.orderWindow.findMany).toHaveBeenCalledWith({
        where: { status: 'OPEN', distributorId: 'd1' },
      });
      expect(result.windowsProcessed).toBe(0);
    });
  });
});
