import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@moderns-milk/database';
import {
  AdvanceOrderInput,
  CreateOrderInput,
  ReviewOrderInput,
} from '@moderns-milk/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../common/auth/current-user.decorator';
import {
  canAccessDistributorResource,
  canAccessRetailerResource,
} from '../common/authz/scope';
import { assertTransition } from './domain/order-state-machine';
import { isWindowOpen, pickOpenWindow } from './domain/cutoff';
import { evaluateApproval } from './domain/auto-approval';
import { LedgerService } from '../ledger/ledger.service';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

const APPROVAL_TOLERANCE = 0.2; // +20% over standing baseline before manual review

@Injectable()
export class OrderingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
  ) {}

  // -- pricing ---------------------------------------------------------------

  private async retailPriceMap(
    productIds: string[],
  ): Promise<Map<string, { price: Decimal; taxRate: Decimal }>> {
    const now = new Date();
    const priceList = await this.prisma.priceList.findFirst({
      where: {
        customerTier: 'RETAILER',
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      orderBy: { validFrom: 'desc' },
      include: {
        items: { where: { productId: { in: productIds } }, include: { product: true } },
      },
    });
    if (!priceList) {
      throw new BadRequestException('No active retail price list configured');
    }
    const map = new Map<string, { price: Decimal; taxRate: Decimal }>();
    for (const item of priceList.items) {
      map.set(item.productId, {
        price: item.price,
        taxRate: item.product.taxRate,
      });
    }
    return map;
  }

  // -- acting actor ----------------------------------------------------------

  /**
   * Resolves who an order is placed for. A retailer orders as themselves. A
   * distributor (the single-role model) orders on behalf of a retailer account
   * within their own distributor — so the order still satisfies the schema's
   * required retailerId while keeping distributor scope.
   */
  private async resolveOrderingActor(
    user: AuthenticatedUser,
  ): Promise<{ retailerId: string; distributorId: string }> {
    if (user.retailerId) {
      const retailer = await this.prisma.retailer.findUnique({
        where: { id: user.retailerId },
      });
      if (!retailer) throw new NotFoundException('Retailer not found');
      return { retailerId: retailer.id, distributorId: retailer.distributorId };
    }
    if (user.distributorId) {
      const retailer = await this.prisma.retailer.findFirst({
        where: { distributorId: user.distributorId, status: 'ACTIVE' },
        orderBy: { id: 'asc' },
      });
      if (!retailer) {
        throw new BadRequestException(
          'No retailer account exists for this distributor',
        );
      }
      return { retailerId: retailer.id, distributorId: user.distributorId };
    }
    throw new ForbiddenException('This account cannot place orders');
  }

  // -- create ----------------------------------------------------------------

  async createOrder(user: AuthenticatedUser, input: CreateOrderInput) {
    const { retailerId, distributorId } = await this.resolveOrderingActor(user);

    const window = await this.prisma.orderWindow.findUnique({
      where: { id: input.orderWindowId },
    });
    if (!window) throw new NotFoundException('Order window not found');

    // Window must belong to the actor's distributor (scope) and be open.
    if (window.distributorId !== distributorId) {
      throw new ForbiddenException('Window does not belong to your distributor');
    }
    if (!isWindowOpen(window, new Date())) {
      throw new BadRequestException('Order window is closed (cutoff passed)');
    }

    const productIds = input.items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Duplicate products in order');
    }
    const prices = await this.retailPriceMap(productIds);

    let subtotal = new Decimal(0);
    let taxTotal = new Decimal(0);
    const itemRows = input.items.map((i) => {
      const priced = prices.get(i.productId);
      if (!priced) {
        throw new BadRequestException(`No price for product ${i.productId}`);
      }
      const qty = new Decimal(i.qty);
      const lineNet = priced.price.mul(qty);
      const lineTax = lineNet.mul(priced.taxRate).div(100);
      subtotal = subtotal.add(lineNet);
      taxTotal = taxTotal.add(lineTax);
      return {
        productId: i.productId,
        unitPrice: priced.price,
        qtyOrdered: qty,
      };
    });

    const order = await this.prisma.order.create({
      data: {
        retailerId,
        distributorId,
        orderWindowId: window.id,
        deliveryDate: window.deliveryDate,
        status: 'DRAFT',
        source: 'MANUAL',
        // A distributor may tag the order as a self-order (spec §2.5-2.7).
        orderType: user.role === 'DISTRIBUTOR' ? input.orderType : 'RETAILER',
        subtotal,
        taxTotal,
        total: subtotal.add(taxTotal),
        items: { create: itemRows },
      },
      include: { items: true },
    });
    return order;
  }

  /**
   * Create a fulfillment order for a specific retailer (used by sales-visit
   * booking). Best-effort: returns null when there is no open window so the
   * visit can still be recorded. Reuses retail pricing.
   */
  async createOrderForRetailer(
    retailerId: string,
    items: { productId: string; qty: string }[],
  ): Promise<{ id: string; total: Decimal } | null> {
    if (items.length === 0) return null;

    const retailer = await this.prisma.retailer.findUnique({
      where: { id: retailerId },
    });
    if (!retailer) throw new NotFoundException('Retailer not found');

    const windows = await this.prisma.orderWindow.findMany({
      where: { distributorId: retailer.distributorId, status: 'OPEN' },
      orderBy: { deliveryDate: 'asc' },
    });
    const window = pickOpenWindow(windows, new Date());
    if (!window) return null;

    const productIds = items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Duplicate products in order');
    }
    const prices = await this.retailPriceMap(productIds);

    let subtotal = new Decimal(0);
    let taxTotal = new Decimal(0);
    const itemRows = items.map((i) => {
      const priced = prices.get(i.productId);
      if (!priced) {
        throw new BadRequestException(`No price for product ${i.productId}`);
      }
      const qty = new Decimal(i.qty);
      const lineNet = priced.price.mul(qty);
      const lineTax = lineNet.mul(priced.taxRate).div(100);
      subtotal = subtotal.add(lineNet);
      taxTotal = taxTotal.add(lineTax);
      return { productId: i.productId, unitPrice: priced.price, qtyOrdered: qty };
    });

    const order = await this.prisma.order.create({
      data: {
        retailerId: retailer.id,
        distributorId: retailer.distributorId,
        orderWindowId: window.id,
        deliveryDate: window.deliveryDate,
        status: 'DRAFT',
        source: 'MANUAL',
        subtotal,
        taxTotal,
        total: subtotal.add(taxTotal),
        items: { create: itemRows },
      },
    });
    return { id: order.id, total: order.total };
  }

  /**
   * Create an order from explicit lines into a specific window, with the given
   * source. Reuses retail pricing. Used by the standing-order generator (and
   * any other server-side materializer) — bypasses actor resolution because the
   * retailer/distributor/window are already known and authorized by the caller.
   */
  async createOrderFromLines(params: {
    retailerId: string;
    distributorId: string;
    window: { id: string; deliveryDate: Date };
    items: { productId: string; qty: Decimal | string }[];
    source: 'STANDING' | 'MANUAL';
  }) {
    const { retailerId, distributorId, window, items, source } = params;
    if (items.length === 0) {
      throw new BadRequestException('Cannot create an order with no items');
    }

    const productIds = items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Duplicate products in order');
    }
    const prices = await this.retailPriceMap(productIds);

    let subtotal = new Decimal(0);
    let taxTotal = new Decimal(0);
    const itemRows = items.map((i) => {
      const priced = prices.get(i.productId);
      if (!priced) {
        throw new BadRequestException(`No price for product ${i.productId}`);
      }
      const qty = new Decimal(i.qty);
      const lineNet = priced.price.mul(qty);
      const lineTax = lineNet.mul(priced.taxRate).div(100);
      subtotal = subtotal.add(lineNet);
      taxTotal = taxTotal.add(lineTax);
      return { productId: i.productId, unitPrice: priced.price, qtyOrdered: qty };
    });

    return this.prisma.order.create({
      data: {
        retailerId,
        distributorId,
        orderWindowId: window.id,
        deliveryDate: window.deliveryDate,
        status: 'DRAFT',
        source,
        subtotal,
        taxTotal,
        total: subtotal.add(taxTotal),
        items: { create: itemRows },
      },
      include: { items: true },
    });
  }

  // -- current window --------------------------------------------------------

  async getCurrentWindow(user: AuthenticatedUser) {
    const { distributorId } = await this.resolveOrderingActor(user);

    const windows = await this.prisma.orderWindow.findMany({
      where: { distributorId, status: 'OPEN' },
      orderBy: { deliveryDate: 'asc' },
    });
    const open = pickOpenWindow(windows, new Date());
    if (!open) throw new NotFoundException('No open order window');
    return open;
  }

  // -- submit (with exception-based auto approval) ---------------------------

  async submitOrder(user: AuthenticatedUser, orderId: string) {
    const order = await this.loadOrderForActor(user, orderId);
    if (user.role === 'RETAILER' && order.retailerId !== user.retailerId) {
      throw new ForbiddenException('Not your order');
    }
    assertTransition(order.status, 'SUBMITTED');

    const account = await this.prisma.retailerAccount.findUnique({
      where: { retailerId: order.retailerId },
    });
    const standing = await this.prisma.standingOrder.findFirst({
      where: { retailerId: order.retailerId, active: true },
      include: { items: true },
    });
    const priorOrders = await this.prisma.order.count({
      where: {
        retailerId: order.retailerId,
        id: { not: order.id },
        status: { in: ['APPROVED', 'IN_PRODUCTION', 'DISPATCHED', 'DELIVERED', 'SETTLED'] },
      },
    });

    const standingTotal = standing
      ? await this.estimateStandingTotal(standing.items)
      : null;
    const standingSkus = new Set(standing?.items.map((i) => i.productId) ?? []);
    const hasNewSku =
      standingSkus.size > 0 &&
      order.items.some((i) => !standingSkus.has(i.productId));

    const decision = evaluateApproval({
      orderTotal: order.total.toNumber(),
      standingTotal,
      tolerancePct: APPROVAL_TOLERANCE,
      accountBalance: account?.balance.toNumber() ?? 0,
      creditLimit: account?.creditLimit.toNumber() ?? 0,
      isNewRetailer: priorOrders === 0,
      hasNewSku,
    });

    return this.prisma.$transaction(async (tx) => {
      // DRAFT -> SUBMITTED
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'SUBMITTED' },
      });
      await this.audit.record(
        {
          actorId: user.userId,
          action: 'ORDER_SUBMITTED',
          entity: 'Order',
          entityId: order.id,
          after: { status: 'SUBMITTED' },
        },
        tx,
      );

      if (decision.type === 'AUTO_APPROVE') {
        const approved = await tx.order.update({
          where: { id: order.id },
          data: { status: 'APPROVED', approvalType: 'AUTO' },
          include: { items: true },
        });
        // Copy ordered -> approved quantities.
        for (const item of order.items) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { qtyApproved: item.qtyOrdered },
          });
        }
        await this.audit.record(
          {
            actorId: user.userId,
            action: 'ORDER_AUTO_APPROVED',
            entity: 'Order',
            entityId: order.id,
            after: { status: 'APPROVED', approvalType: 'AUTO' },
          },
          tx,
        );
        return { ...approved, reviewReasons: [] as string[] };
      }

      // Stays SUBMITTED awaiting manual review.
      return {
        ...order,
        status: 'SUBMITTED' as const,
        reviewReasons: decision.reasons,
      };
    });
  }

  // -- manual review ---------------------------------------------------------

  async reviewOrder(user: AuthenticatedUser, input: ReviewOrderInput) {
    const order = await this.loadOrderForActor(user, input.orderId);
    if (!canAccessDistributorResource(user, order.distributorId)) {
      throw new ForbiddenException('Out of scope');
    }
    if (order.status !== 'SUBMITTED') {
      throw new BadRequestException('Only submitted orders can be reviewed');
    }

    const target = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    assertTransition(order.status, target);

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: target,
          approvalType: input.decision === 'APPROVE' ? 'MANUAL' : undefined,
          approvedById: input.decision === 'APPROVE' ? user.userId : undefined,
          rejectedById: input.decision === 'REJECT' ? user.userId : undefined,
          rejectReason: input.decision === 'REJECT' ? input.reason ?? null : undefined,
          reviewedAt: new Date(),
        },
      });
      if (input.decision === 'APPROVE') {
        for (const item of order.items) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { qtyApproved: item.qtyOrdered },
          });
        }
      }
      await this.audit.record(
        {
          actorId: user.userId,
          action: input.decision === 'APPROVE' ? 'ORDER_APPROVED' : 'ORDER_REJECTED',
          entity: 'Order',
          entityId: order.id,
          before: { status: order.status },
          after: { status: target, reason: input.reason },
        },
        tx,
      );
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          items: true,
          approvedBy: { select: { name: true } },
          rejectedBy: { select: { name: true } },
        },
      });
    });
  }

  // -- reads -----------------------------------------------------------------

  async getOrder(user: AuthenticatedUser, orderId: string) {
    const order = await this.loadOrderForActor(user, orderId);
    return order;
  }

  async advanceOrder(user: AuthenticatedUser, input: AdvanceOrderInput) {
    const order = await this.loadOrderForActor(user, input.orderId);
    if (!canAccessDistributorResource(user, order.distributorId)) {
      throw new ForbiddenException('Out of scope');
    }
    assertTransition(order.status, input.toStatus);

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: input.toStatus },
      });
      // Capture quantities as the order physically moves.
      if (input.toStatus === 'DISPATCHED') {
        for (const item of order.items) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { qtyDispatched: item.qtyApproved ?? item.qtyOrdered },
          });
        }
      }
      if (input.toStatus === 'DELIVERED') {
        for (const item of order.items) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              qtyDelivered:
                item.qtyDispatched ?? item.qtyApproved ?? item.qtyOrdered,
            },
          });
        }
        // Delivery creates the dues: debit the outlet's ledger for the total.
        await this.ledger.postWithinTx(
          tx,
          order.retailerId,
          'DEBIT',
          order.total,
          'ORDER',
          order.id,
          `Order #${order.id.slice(-6).toUpperCase()}`,
        );
      }
      await this.audit.record(
        {
          actorId: user.userId,
          action: `ORDER_${input.toStatus}`,
          entity: 'Order',
          entityId: order.id,
          before: { status: order.status },
          after: { status: input.toStatus },
        },
        tx,
      );
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true },
      });
    });
  }

  async listOrders(user: AuthenticatedUser) {
    const where: Prisma.OrderWhereInput = {};
    if (user.role === 'RETAILER') {
      where.retailerId = user.retailerId;
    } else if (user.role === 'SALES_OFFICER' || user.role === 'DISTRIBUTOR') {
      where.distributorId = user.distributorId;
    }
    // ADMIN / SALES_HEAD: unrestricted.
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        items: true,
        retailer: {
          select: { shopName: true, user: { select: { name: true, phone: true } } },
        },
        approvedBy: { select: { name: true } },
        rejectedBy: { select: { name: true } },
      },
    });
  }

  // -- helpers ---------------------------------------------------------------

  private async loadOrderForActor(user: AuthenticatedUser, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        retailer: {
          select: { shopName: true, user: { select: { name: true, phone: true } } },
        },
        approvedBy: { select: { name: true } },
        rejectedBy: { select: { name: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = canAccessRetailerResource(
      user,
      order.retailerId,
      order.distributorId,
    );
    if (!allowed) throw new ForbiddenException('Out of scope');
    return order;
  }

  private async estimateStandingTotal(
    items: { productId: string; qty: Decimal }[],
  ): Promise<number> {
    const prices = await this.retailPriceMap(items.map((i) => i.productId));
    let total = new Decimal(0);
    for (const i of items) {
      const priced = prices.get(i.productId);
      if (!priced) continue;
      const net = priced.price.mul(i.qty);
      const tax = net.mul(priced.taxRate).div(100);
      total = total.add(net).add(tax);
    }
    return total.toNumber();
  }
}
