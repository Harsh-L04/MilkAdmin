import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerInput, UpdateProfileInput } from '@moderns-milk/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../common/auth/current-user.decorator';

interface RetailerWithRefs {
  id: string;
  shopName: string;
  addressLine: string | null;
  gstin: string | null;
  whatsapp: string | null;
  paymentTerms: string | null;
  outletType: 'NEW' | 'EXISTING';
  createdAt: Date;
  route: { name: string } | null;
  user: { phone: string } | null;
  salesOfficer: { name: string } | null;
}

const RETAILER_INCLUDE = {
  route: true,
  user: { select: { phone: true } },
  salesOfficer: { select: { name: true } },
} as const;

@Injectable()
export class DistributorService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeId(user: AuthenticatedUser): string {
    if (!user.distributorId) {
      throw new ForbiddenException('No distributor in scope');
    }
    return user.distributorId;
  }

  // -- profile ---------------------------------------------------------------

  async getProfile(user: AuthenticatedUser) {
    const distributorId = this.scopeId(user);
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });
    if (!distributor) throw new NotFoundException('Distributor not found');
    const me = await this.prisma.user.findUnique({ where: { id: user.userId } });

    return {
      businessName: distributor.name,
      contactName: me?.name ?? '',
      address: distributor.address,
      phone: me?.phone ?? '',
      region: distributor.region,
    };
  }

  async updateProfile(user: AuthenticatedUser, input: UpdateProfileInput) {
    const distributorId = this.scopeId(user);

    if (input.businessName !== undefined || input.address !== undefined) {
      await this.prisma.distributor.update({
        where: { id: distributorId },
        data: {
          ...(input.businessName !== undefined ? { name: input.businessName } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
        },
      });
    }
    if (input.contactName !== undefined) {
      await this.prisma.user.update({
        where: { id: user.userId },
        data: { name: input.contactName },
      });
    }
    return this.getProfile(user);
  }

  // -- customers -------------------------------------------------------------

  async listCustomers(user: AuthenticatedUser) {
    const distributorId = this.scopeId(user);
    const retailers = await this.prisma.retailer.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: RETAILER_INCLUDE,
    });
    return retailers.map((r) => this.toCustomerDto(r));
  }

  async listSalesTeam(user: AuthenticatedUser) {
    const distributorId = this.scopeId(user);
    const reps = await this.prisma.user.findMany({
      where: { role: 'SALES_OFFICER', distributorId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true },
    });
    return reps;
  }

  async createCustomer(user: AuthenticatedUser, input: CreateCustomerInput) {
    const distributorId = this.scopeId(user);

    const clash = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (clash) {
      throw new ConflictException('A customer with this number already exists');
    }

    const retailer = await this.prisma.$transaction(async (tx) => {
      // Route: find-or-create under this distributor (free-text name).
      let route = await tx.route.findFirst({
        where: { distributorId, name: input.route },
      });
      if (!route) {
        const count = await tx.route.count({ where: { distributorId } });
        route = await tx.route.create({
          data: { distributorId, name: input.route, sequence: count + 1 },
        });
      }

      // Stub user holds the contact number; it never logs in.
      const customerUser = await tx.user.create({
        data: { phone: input.phone, name: input.outletName, role: 'RETAILER' },
      });

      const created = await tx.retailer.create({
        data: {
          userId: customerUser.id,
          distributorId,
          routeId: route.id,
          shopName: input.outletName,
          addressLine: input.address,
          gstin: input.gstin ?? null,
          whatsapp: input.whatsapp ?? null,
          paymentTerms: input.paymentTerms ?? null,
          outletType: input.outletType,
          salesOfficerId: input.salesOfficerId ?? null,
        },
        include: RETAILER_INCLUDE,
      });

      await tx.retailerAccount.create({
        data: { retailerId: created.id, balance: '0', creditLimit: '0' },
      });

      return created;
    });

    return this.toCustomerDto(retailer);
  }

  private toCustomerDto(r: RetailerWithRefs) {
    return {
      id: r.id,
      outletName: r.shopName,
      address: r.addressLine,
      route: r.route?.name ?? null,
      gstin: r.gstin,
      phone: r.user?.phone ?? '',
      whatsapp: r.whatsapp,
      paymentTerms: r.paymentTerms,
      outletType: r.outletType,
      salesOfficer: r.salesOfficer?.name ?? null,
      createdAt: r.createdAt,
    };
  }
}
