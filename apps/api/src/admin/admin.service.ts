import { Injectable } from '@nestjs/common';
import { Prisma } from '@moderns-milk/database';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../common/auth/current-user.decorator';

/**
 * Company-wide registry (ADMIN / SALES_HEAD). The whole point: HQ owns the
 * distributor + retailer book centrally, so it survives distributor churn.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aggregated KPIs for the dashboard. Scoped by distributor for staff. */
  async dashboard(user: AuthenticatedUser) {
    const scoped = !(user.role === 'ADMIN' || user.role === 'SALES_HEAD');
    const distributorId = user.distributorId ?? '__none__';
    const retailerWhere: Prisma.RetailerWhereInput = scoped ? { distributorId } : {};
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const visitWhere: Prisma.SalesVisitWhereInput = {
      date: { gte: since },
      ...(scoped ? { distributorId } : {}),
    };

    const [
      distributors,
      outlets,
      salesReps,
      duesAgg,
      outletsWithDues,
      visits,
      newOutlets,
      visitsWithOrder,
      topSkus,
    ] = await Promise.all([
      scoped ? Promise.resolve(1) : this.prisma.distributor.count(),
      this.prisma.retailer.count({ where: retailerWhere }),
      this.prisma.user.count({
        where: { role: 'SALES_OFFICER', ...(scoped ? { distributorId } : {}) },
      }),
      this.prisma.retailerAccount.aggregate({
        _sum: { balance: true },
        where: scoped ? { retailer: { distributorId } } : {},
      }),
      this.prisma.retailerAccount.count({
        where: { balance: { gt: 0 }, ...(scoped ? { retailer: { distributorId } } : {}) },
      }),
      this.prisma.salesVisit.count({ where: visitWhere }),
      this.prisma.salesVisit.count({ where: { ...visitWhere, outletType: 'NEW' } }),
      this.prisma.salesVisit.count({ where: { ...visitWhere, orderId: { not: null } } }),
      this.prisma.$queryRaw<
        { productId: string; name: string; qty: string; value: string }[]
      >(Prisma.sql`
        SELECT oi."productId" AS "productId", p.name AS name,
               SUM(oi."qtyOrdered")::text AS qty,
               SUM(oi."unitPrice" * oi."qtyOrdered")::text AS value
        FROM "OrderItem" oi
        JOIN "Product" p ON p.id = oi."productId"
        JOIN "Order" o ON o.id = oi."orderId"
        ${scoped ? Prisma.sql`WHERE o."distributorId" = ${distributorId}` : Prisma.empty}
        GROUP BY oi."productId", p.name
        ORDER BY SUM(oi."unitPrice" * oi."qtyOrdered") DESC
        LIMIT 5
      `),
    ]);

    return {
      network: { distributors, outlets, salesReps },
      dues: {
        outstanding: (duesAgg._sum.balance ?? 0).toString(),
        outletsWithDues,
      },
      visits: {
        count: visits,
        newOutlets,
        withOrder: visitsWithOrder,
        strikeRatePct: visits > 0 ? Math.round((visitsWithOrder / visits) * 100) : 0,
      },
      topSkus: topSkus.map((s) => ({
        productId: s.productId,
        name: s.name,
        qty: Number(s.qty),
        value: s.value,
      })),
    };
  }

  async listDistributors() {
    const rows = await this.prisma.distributor.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { retailers: true, routes: true } } },
    });
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      region: d.region,
      address: d.address,
      status: d.status,
      outlets: d._count.retailers,
      routes: d._count.routes,
    }));
  }

  async listRetailers() {
    const rows = await this.prisma.retailer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        distributor: { select: { name: true } },
        route: { select: { name: true } },
        user: { select: { name: true, phone: true } },
        salesOfficer: { select: { name: true } },
        account: { select: { balance: true, creditLimit: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      outletName: r.shopName,
      contactName: r.user?.name ?? null,
      phone: r.user?.phone ?? null,
      whatsapp: r.whatsapp,
      route: r.route?.name ?? null,
      distributor: r.distributor?.name ?? null,
      salesOfficer: r.salesOfficer?.name ?? null,
      outletType: r.outletType,
      paymentTerms: r.paymentTerms,
      gstin: r.gstin,
      address: r.addressLine,
      balance: (r.account?.balance ?? 0).toString(),
      creditLimit: (r.account?.creditLimit ?? 0).toString(),
      status: r.status,
      createdAt: r.createdAt,
    }));
  }
}
