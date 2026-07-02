import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSalesVisitInput } from '@moderns-milk/contracts';
import { Prisma } from '@moderns-milk/database';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../common/auth/current-user.decorator';
import { canAccessDistributorResource } from '../common/authz/scope';
import { OrderingService } from '../ordering/ordering.service';

const VISIT_INCLUDE = {
  salesOfficer: { select: { name: true } },
  retailer: { select: { shopName: true } },
  order: { select: { total: true } },
  _count: { select: { items: true } },
} as const;

type VisitRow = {
  id: string;
  date: Date;
  routeName: string | null;
  outletType: 'NEW' | 'EXISTING';
  inTime: Date | null;
  bookingTime: Date | null;
  competition: string | null;
  remarks: string | null;
  orderId: string | null;
  createdAt: Date;
  salesOfficer: { name: string } | null;
  retailer: { shopName: string } | null;
  order: { total: { toString(): string } } | null;
  _count: { items: number };
};

@Injectable()
export class SalesVisitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordering: OrderingService,
  ) {}

  private combine(date: string, time?: string): Date | null {
    if (!time) return null;
    return new Date(`${date}T${time}:00`);
  }

  private fmtTime(d: Date | null): string | null {
    if (!d) return null;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  async create(user: AuthenticatedUser, input: CreateSalesVisitInput) {
    const retailer = await this.prisma.retailer.findUnique({
      where: { id: input.retailerId },
    });
    if (!retailer) throw new NotFoundException('Outlet not found');
    if (!canAccessDistributorResource(user, retailer.distributorId)) {
      throw new ForbiddenException('Outlet is out of your scope');
    }

    // Best-effort fulfillment order from the positive SKU lines.
    const positiveItems = input.items.filter((i) => Number(i.qty) > 0);
    const order = await this.ordering.createOrderForRetailer(
      retailer.id,
      positiveItems,
    );

    const visit = await this.prisma.salesVisit.create({
      data: {
        // Date-only field: pin to UTC midnight so it never shifts a day.
        date: new Date(`${input.date}T00:00:00Z`),
        dayStartAt: this.combine(input.date, input.dayStartAt),
        salesOfficerId: input.salesOfficerId,
        distributorId: retailer.distributorId,
        retailerId: retailer.id,
        routeName: input.routeName ?? null,
        outletType: input.outletType,
        inTime: this.combine(input.date, input.inTime),
        bookingTime: this.combine(input.date, input.bookingTime),
        competition: input.competition ?? null,
        remarks: input.remarks ?? null,
        orderId: order?.id ?? null,
        items: {
          create: positiveItems.map((i) => ({
            productId: i.productId,
            qty: i.qty,
          })),
        },
      },
      include: VISIT_INCLUDE,
    });
    return this.toDto(visit);
  }

  async list(
    user: AuthenticatedUser,
    filters: { dateFrom?: string; dateTo?: string; outletType?: string } = {},
  ) {
    const where: Prisma.SalesVisitWhereInput =
      user.role === 'ADMIN' || user.role === 'SALES_HEAD'
        ? {}
        : { distributorId: user.distributorId ?? '__none__' };

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }
    if (filters.outletType && (filters.outletType === 'NEW' || filters.outletType === 'EXISTING')) {
      where.outletType = filters.outletType;
    }

    const visits = await this.prisma.salesVisit.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 200,
      include: VISIT_INCLUDE,
    });
    return visits.map((v) => this.toDto(v));
  }

  private toDto(v: VisitRow) {
    return {
      id: v.id,
      date: v.date.toISOString().slice(0, 10),
      salesOfficer: v.salesOfficer?.name ?? '',
      retailer: v.retailer?.shopName ?? '',
      route: v.routeName,
      outletType: v.outletType,
      inTime: this.fmtTime(v.inTime),
      bookingTime: this.fmtTime(v.bookingTime),
      competition: v.competition,
      remarks: v.remarks,
      itemCount: v._count.items,
      orderId: v.orderId,
      orderTotal: v.order?.total.toString() ?? null,
      createdAt: v.createdAt.toISOString(),
    };
  }
}
