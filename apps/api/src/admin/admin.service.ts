import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Company-wide registry (ADMIN / SALES_HEAD). The whole point: HQ owns the
 * distributor + retailer book centrally, so it survives distributor churn.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
