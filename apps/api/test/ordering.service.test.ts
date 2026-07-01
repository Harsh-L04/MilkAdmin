import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@moderns-milk/database';
import { OrderingService } from '../src/ordering/ordering.service';

const Decimal = Prisma.Decimal;

function makeDecimal(initial: number) {
  return new Decimal(initial);
}

const mockPrisma = {
  priceList: { findFirst: vi.fn() },
  orderWindow: { findUnique: vi.fn(), findMany: vi.fn() },
  retailer: { findUnique: vi.fn(), findFirst: vi.fn() },
  order: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  orderItem: { update: vi.fn() },
  retailerAccount: { findUnique: vi.fn() },
  standingOrder: { findFirst: vi.fn() },
  $transaction: vi.fn((cb: (tx: any) => any) => cb(mockTx)),
};

const mockTx = {
  order: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
  orderItem: { update: vi.fn() },
  retailerAccount: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  ledgerEntry: { create: vi.fn() },
};

const mockAudit = {
  record: vi.fn(),
};

const mockLedger = {
  postWithinTx: vi.fn(),
};

const baseUser = {
  userId: 'u1',
  role: 'RETAILER' as const,
  retailerId: 'r1',
  distributorId: 'd1',
};

const distUser = {
  userId: 'u2',
  role: 'DISTRIBUTOR' as const,
  distributorId: 'd1',
};

const adminUser = {
  userId: 'u3',
  role: 'ADMIN' as const,
};

const defaultWindow = {
  id: 'w1',
  distributorId: 'd1',
  deliveryDate: new Date('2026-06-27'),
  cutoffAt: new Date('2026-06-26T18:00:00Z'),
  status: 'OPEN',
};

const defaultProductPrices = {
  id: 'pl1',
  items: [
    {
      productId: 'p1',
      price: makeDecimal(50),
      product: { taxRate: makeDecimal(5) },
    },
  ],
};

describe('OrderingService', () => {
  let service: OrderingService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T08:00:00Z'));
    service = new OrderingService(
      mockPrisma as any,
      mockAudit as any,
      mockLedger as any,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createOrder', () => {
    const input = {
      orderWindowId: 'w1',
      items: [{ productId: 'p1', qty: '10' }],
    };

    it('creates an order successfully', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findUnique.mockResolvedValue(defaultWindow);
      mockPrisma.priceList.findFirst.mockResolvedValue(defaultProductPrices);
      mockPrisma.order.create.mockResolvedValue({
        id: 'o1',
        status: 'DRAFT',
        items: [],
      });

      const result = await service.createOrder(baseUser, input);
      expect(result.id).toBe('o1');
    });

    it('throws NotFoundException when window not found', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findUnique.mockResolvedValue(null);
      await expect(service.createOrder(baseUser, input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when window is closed', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findUnique.mockResolvedValue({
        ...defaultWindow,
        cutoffAt: new Date('2026-06-26T06:00:00Z'),
      });
      await expect(service.createOrder(baseUser, input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for duplicate products', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findUnique.mockResolvedValue(defaultWindow);
      await expect(
        service.createOrder(baseUser, {
          ...input,
          items: [
            { productId: 'p1', qty: '10' },
            { productId: 'p1', qty: '5' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no price for product', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findUnique.mockResolvedValue(defaultWindow);
      mockPrisma.priceList.findFirst.mockResolvedValue({
        id: 'pl1',
        items: [],
      });
      await expect(service.createOrder(baseUser, input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets orderType to input.orderType when user is DISTRIBUTOR', async () => {
      mockPrisma.retailer.findFirst.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findUnique.mockResolvedValue(defaultWindow);
      mockPrisma.priceList.findFirst.mockResolvedValue(defaultProductPrices);
      mockPrisma.order.create.mockResolvedValue({
        id: 'o1',
        status: 'DRAFT',
        items: [],
      });

      await service.createOrder(distUser, { ...input, orderType: 'SELF' });
      const createCall = mockPrisma.order.create.mock.calls[0][0];
      expect(createCall.data.orderType).toBe('SELF');
    });
  });

  describe('resolveOrderingActor', () => {
    it('uses retailerId when user is a retailer', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findUnique.mockResolvedValue(defaultWindow);
      mockPrisma.priceList.findFirst.mockResolvedValue(defaultProductPrices);
      mockPrisma.order.create.mockResolvedValue({
        id: 'o1',
        status: 'DRAFT',
        items: [],
      });

      await service.createOrder(baseUser, {
        orderWindowId: 'w1',
        items: [{ productId: 'p1', qty: '10' }],
      });
      expect(mockPrisma.retailer.findUnique).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
    });

    it('picks first active retailer for distributor', async () => {
      mockPrisma.retailer.findFirst.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findUnique.mockResolvedValue(defaultWindow);
      mockPrisma.priceList.findFirst.mockResolvedValue(defaultProductPrices);
      mockPrisma.order.create.mockResolvedValue({
        id: 'o1',
        status: 'DRAFT',
        items: [],
      });

      await service.createOrder(distUser, {
        orderWindowId: 'w1',
        items: [{ productId: 'p1', qty: '10' }],
      });
      expect(mockPrisma.retailer.findFirst).toHaveBeenCalledWith({
        where: { distributorId: 'd1', status: 'ACTIVE' },
        orderBy: { id: 'asc' },
      });
    });

    it('throws ForbiddenException when user has no role', async () => {
      const noRoleUser = { userId: 'u4', role: 'SOME_OTHER' as any };
      await expect(
        service.createOrder(noRoleUser, {
          orderWindowId: 'w1',
          items: [{ productId: 'p1', qty: '10' }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('submitOrder', () => {
    const order = {
      id: 'o1',
      status: 'DRAFT',
      retailerId: 'r1',
      distributorId: 'd1',
      total: makeDecimal(1000),
      items: [{ id: 'i1', productId: 'p1', qtyOrdered: '10' }],
    };

    it('auto-approves when all conditions pass', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.retailerAccount.findUnique.mockResolvedValue({
        balance: makeDecimal(0),
        creditLimit: makeDecimal(20000),
      });
      mockPrisma.standingOrder.findFirst.mockResolvedValue(null);
      mockPrisma.order.count.mockResolvedValue(5);
      mockTx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: 'APPROVED', approvalType: 'AUTO', items: order.items });
      mockTx.order.update.mockResolvedValue({ status: 'APPROVED', approvalType: 'AUTO' });

      const result = await service.submitOrder(baseUser, 'o1');
      expect(result.status).toBe('APPROVED');
    });

    it('routes to manual review for new retailer', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.retailerAccount.findUnique.mockResolvedValue({
        balance: makeDecimal(0),
        creditLimit: makeDecimal(20000),
      });
      mockPrisma.standingOrder.findFirst.mockResolvedValue(null);
      mockPrisma.order.count.mockResolvedValue(0);

      const result = await service.submitOrder(baseUser, 'o1');
      expect(result.status).toBe('SUBMITTED');
      expect(result.reviewReasons).toContain('NEW_RETAILER');
    });

    it('throws ForbiddenException for wrong retailer', async () => {
      const wrongRetailer = {
        userId: 'u2',
        role: 'RETAILER' as const,
        retailerId: 'r2',
        distributorId: 'd1',
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);
      await expect(
        service.submitOrder(wrongRetailer, 'o1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reviewOrder', () => {
    const order = {
      id: 'o1',
      status: 'SUBMITTED',
      retailerId: 'r1',
      distributorId: 'd1',
      items: [{ id: 'i1', qtyOrdered: '10' }],
    };

    it('approves order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockTx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: 'APPROVED', approvedBy: null, rejectedBy: null });
      mockTx.order.update.mockResolvedValue({});
      mockTx.orderItem.update.mockResolvedValue({});

      const result = await service.reviewOrder(adminUser, {
        orderId: 'o1',
        decision: 'APPROVE',
      });
      expect(mockTx.order.update).toHaveBeenCalled();
    });

    it('rejects order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockTx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: 'REJECTED', approvedBy: null, rejectedBy: null });
      mockTx.order.update.mockResolvedValue({});

      const result = await service.reviewOrder(adminUser, {
        orderId: 'o1',
        decision: 'REJECT',
        reason: 'Too expensive',
      });
      expect(result.status).toBe('REJECTED');
    });

    it('throws BadRequestException when order is not SUBMITTED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...order,
        status: 'DRAFT',
      });
      await expect(
        service.reviewOrder(adminUser, {
          orderId: 'o1',
          decision: 'APPROVE',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('advanceOrder', () => {
    const order = {
      id: 'o1',
      status: 'APPROVED',
      retailerId: 'r1',
      distributorId: 'd1',
      total: makeDecimal(500),
      items: [{ id: 'i1', qtyApproved: '10', qtyOrdered: '10', qtyDispatched: null }],
    };

    it('advances to IN_PRODUCTION', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockTx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: 'IN_PRODUCTION', items: order.items });
      mockTx.order.update.mockResolvedValue({});

      await service.advanceOrder(adminUser, {
        orderId: 'o1',
        toStatus: 'IN_PRODUCTION',
      });
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'IN_PRODUCTION' },
        }),
      );
    });

    it('advances to DISPATCHED and sets qtyDispatched', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...order,
        status: 'IN_PRODUCTION',
      });
      mockTx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: 'DISPATCHED', items: order.items });
      mockTx.order.update.mockResolvedValue({});
      mockTx.orderItem.update.mockResolvedValue({});

      await service.advanceOrder(adminUser, {
        orderId: 'o1',
        toStatus: 'DISPATCHED',
      });
      expect(mockTx.orderItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { qtyDispatched: '10' },
        }),
      );
    });

    it('advances to DELIVERED and posts ledger debit', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...order,
        status: 'DISPATCHED',
      });
      mockTx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: 'DELIVERED', items: order.items });
      mockTx.order.update.mockResolvedValue({});
      mockTx.orderItem.update.mockResolvedValue({});

      await service.advanceOrder(adminUser, {
        orderId: 'o1',
        toStatus: 'DELIVERED',
      });
      expect(mockLedger.postWithinTx).toHaveBeenCalledWith(
        mockTx,
        'r1',
        'DEBIT',
        expect.anything(),
        'ORDER',
        'o1',
        expect.any(String),
      );
    });

    it('throws for invalid transition', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(order);
      await expect(
        service.advanceOrder(adminUser, {
          orderId: 'o1',
          toStatus: 'DRAFT' as any,
        }),
      ).rejects.toThrow();
    });
  });

  describe('listOrders', () => {
    it('scopes by retailerId for RETAILER role', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await service.listOrders(baseUser);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { retailerId: 'r1' },
        }),
      );
    });

    it('scopes by distributorId for DISTRIBUTOR role', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await service.listOrders(distUser);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { distributorId: 'd1' },
        }),
      );
    });

    it('returns all orders for ADMIN role', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await service.listOrders(adminUser);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('createOrderForRetailer', () => {
    it('returns null when items are empty', async () => {
      const result = await service.createOrderForRetailer('r1', []);
      expect(result).toBeNull();
    });

    it('returns null when no open window', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findMany.mockResolvedValue([]);
      const result = await service.createOrderForRetailer('r1', [
        { productId: 'p1', qty: '10' },
      ]);
      expect(result).toBeNull();
    });

    it('creates order successfully', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findMany.mockResolvedValue([defaultWindow]);
      mockPrisma.priceList.findFirst.mockResolvedValue(defaultProductPrices);
      mockPrisma.order.create.mockResolvedValue({
        id: 'o1',
        total: makeDecimal(500),
      });

      const result = await service.createOrderForRetailer('r1', [
        { productId: 'p1', qty: '10' },
      ]);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('o1');
    });
  });

  describe('getCurrentWindow', () => {
    it('throws NotFoundException when no open window', async () => {
      mockPrisma.retailer.findUnique.mockResolvedValue({
        id: 'r1',
        distributorId: 'd1',
      });
      mockPrisma.orderWindow.findMany.mockResolvedValue([]);
      await expect(service.getCurrentWindow(baseUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
