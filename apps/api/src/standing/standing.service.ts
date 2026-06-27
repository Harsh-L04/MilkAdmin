import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@moderns-milk/database';
import { UpsertStandingOrderInput } from '@moderns-milk/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../common/auth/current-user.decorator';
import { canAccessRetailerResource } from '../common/authz/scope';

const STANDING_INCLUDE = {
  retailer: { select: { shopName: true, distributorId: true } },
  items: { include: { product: true } },
} as const;

type StandingRow = Prisma.StandingOrderGetPayload<{
  include: typeof STANDING_INCLUDE;
}>;

@Injectable()
export class StandingService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(user: AuthenticatedUser): Prisma.StandingOrderWhereInput {
    if (user.role === 'ADMIN' || user.role === 'SALES_HEAD') return {};
    return { retailer: { distributorId: user.distributorId ?? '__none__' } };
  }

  private async assertRetailerInScope(user: AuthenticatedUser, retailerId: string) {
    const retailer = await this.prisma.retailer.findUnique({
      where: { id: retailerId },
    });
    if (!retailer) throw new NotFoundException('Outlet not found');
    if (!canAccessRetailerResource(user, retailer.id, retailer.distributorId)) {
      throw new ForbiddenException('Outlet is out of your scope');
    }
    return retailer;
  }

  private async loadInScope(user: AuthenticatedUser, id: string) {
    const so = await this.prisma.standingOrder.findUnique({
      where: { id },
      include: { retailer: { select: { id: true, distributorId: true } } },
    });
    if (!so) throw new NotFoundException('Standing order not found');
    if (
      !canAccessRetailerResource(user, so.retailerId, so.retailer.distributorId)
    ) {
      throw new ForbiddenException('Standing order is out of your scope');
    }
    return so;
  }

  async list(user: AuthenticatedUser) {
    const rows = await this.prisma.standingOrder.findMany({
      where: this.scopeWhere(user),
      orderBy: { createdAt: 'desc' },
      include: STANDING_INCLUDE,
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(user: AuthenticatedUser, input: UpsertStandingOrderInput) {
    await this.assertRetailerInScope(user, input.retailerId);
    const so = await this.prisma.standingOrder.create({
      data: {
        retailerId: input.retailerId,
        name: input.name ?? null,
        weekdayMask: input.weekdayMask,
        active: input.active,
        items: {
          create: input.items.map((i) => ({ productId: i.productId, qty: i.qty })),
        },
      },
      include: STANDING_INCLUDE,
    });
    return this.toDto(so);
  }

  async update(user: AuthenticatedUser, id: string, input: UpsertStandingOrderInput) {
    await this.loadInScope(user, id);
    const so = await this.prisma.$transaction(async (tx) => {
      await tx.standingOrderItem.deleteMany({ where: { standingOrderId: id } });
      return tx.standingOrder.update({
        where: { id },
        data: {
          name: input.name ?? null,
          weekdayMask: input.weekdayMask,
          active: input.active,
          items: {
            create: input.items.map((i) => ({
              productId: i.productId,
              qty: i.qty,
            })),
          },
        },
        include: STANDING_INCLUDE,
      });
    });
    return this.toDto(so);
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.loadInScope(user, id);
    await this.prisma.standingOrder.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(r: StandingRow) {
    return {
      id: r.id,
      name: r.name,
      retailerId: r.retailerId,
      retailer: r.retailer.shopName,
      weekdayMask: r.weekdayMask,
      active: r.active,
      items: r.items.map((i) => ({
        productId: i.productId,
        qty: Number(i.qty),
        product: {
          id: i.product.id,
          sku: i.product.sku,
          name: i.product.name,
          category: i.product.category,
          uom: i.product.uom,
          packSize: i.product.packSize.toString(),
          taxRate: i.product.taxRate.toString(),
          isReturnablePack: i.product.isReturnablePack,
          active: i.product.active,
        },
      })),
    };
  }
}
