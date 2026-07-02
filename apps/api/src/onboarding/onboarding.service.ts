import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnboardDistributorInput,
  OnboardRetailerInput,
  OnboardStaffInput,
  UpdateOnboardingInput,
  OnboardedUserRow,
} from '@moderns-milk/contracts';
import { Prisma } from '@moderns-milk/database';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../common/auth/current-user.decorator';

@Injectable()
export class OnboardingService {
  private readonly bcryptRounds: number;
  private readonly defaultPassword: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.bcryptRounds = config.get<number>('BCRYPT_ROUNDS', 10);
    this.defaultPassword = 'Moderns@2026'; // temp default; changed on first login
  }

  private generatePassword(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  private async assertPhoneFree(phone: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const clash = await client.user.findUnique({ where: { phone } });
    if (clash) throw new ConflictException('A user with this phone already exists');
  }

  private codeFor(name: string): string {
    const slug = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'DIST';
    return `${slug}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  async onboardDistributor(input: OnboardDistributorInput) {
    await this.assertPhoneFree(input.phone);
    const password = await this.hashPassword(this.defaultPassword);

    return this.prisma.$transaction(async (tx) => {
      const distributor = await tx.distributor.create({
        data: {
          code: this.codeFor(input.fullName),
          name: input.fullName,
          region: input.region ?? null,
          subArea: input.subArea ?? null,
          address: input.address ?? null,
          pan: input.pan ?? null,
          bankDetails: input.bankDetails ?? null,
          securityDeposit: input.securityDeposit ?? null,
          onboardingStatus: input.onboardingStatus,
          onboardingNote: input.onboardingNote ?? null,
          assignedSalesOfficerId: input.salesOfficerId ?? null,
          status: input.status,
        },
      });

      const user = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email ?? null,
          name: input.fullName,
          role: 'DISTRIBUTOR',
          status: input.status,
          distributorId: distributor.id,
          passwordHash: password,
        },
      });

      return { id: distributor.id, userId: user.id, code: distributor.code };
    });
  }

  async onboardRetailer(input: OnboardRetailerInput) {
    await this.assertPhoneFree(input.phone);

    const distributor = await this.prisma.distributor.findUnique({
      where: { id: input.distributorId },
    });
    if (!distributor) throw new NotFoundException('Distributor not found');

    const password = await this.hashPassword(this.defaultPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email ?? null,
          name: input.fullName,
          role: 'RETAILER',
          status: input.status,
          passwordHash: password,
        },
      });

      const retailer = await tx.retailer.create({
        data: {
          userId: user.id,
          distributorId: input.distributorId,
          salesOfficerId: input.salesOfficerId ?? null,
          shopName: input.outletName,
          addressLine: input.address ?? null,
          subArea: input.subArea ?? null,
          pan: input.pan ?? null,
          shopLicenseNo: input.shopLicenseNo ?? null,
          licenseImageKey: input.licenseImageKey ?? null,
          securityDeposit: input.securityDeposit ?? null,
          monthlyTurnover: input.monthlyTurnover ?? null,
          shopEstablishedOn: input.shopEstablishedOn ?? null,
          brandsDealing: input.brandsDealing,
          productsSold: input.productsSold,
          instrumentNo: input.instrumentNo ?? null,
          instrumentDate: input.instrumentDate ? new Date(input.instrumentDate) : null,
          onboardingStatus: input.onboardingStatus,
          onboardingNote: input.onboardingNote ?? null,
          status: input.status,
        },
      });

      await tx.retailerAccount.create({
        data: { retailerId: retailer.id, balance: '0', creditLimit: '0' },
      });

      return { id: retailer.id, userId: user.id };
    });
  }

  async onboardStaff(input: OnboardStaffInput) {
    await this.assertPhoneFree(input.phone);

    if (input.role === 'SALES_OFFICER' && input.reportsToId) {
      const head = await this.prisma.user.findUnique({
        where: { id: input.reportsToId },
      });
      if (!head || head.role !== 'SALES_HEAD') {
        throw new BadRequestException('reportsToId must be a Sales Head');
      }
    }

    const password = await this.hashPassword(this.defaultPassword);

    const user = await this.prisma.user.create({
      data: {
        phone: input.phone,
        email: input.email ?? null,
        name: input.fullName,
        role: input.role,
        status: input.status,
        area: input.area ?? null,
        subArea: input.subArea ?? null,
        reportsToId: input.role === 'SALES_OFFICER' ? input.reportsToId ?? null : null,
        passwordHash: password,
      },
    });
    return { id: user.id };
  }

  private distributorScope(user: AuthenticatedUser): Prisma.DistributorWhereInput {
    if (user.role === 'SALES_OFFICER') return { assignedSalesOfficerId: user.userId };
    if (user.role === 'SALES_HEAD')
      return { assignedSalesOfficer: { reportsToId: user.userId } };
    return {};
  }

  private retailerScope(user: AuthenticatedUser): Prisma.RetailerWhereInput {
    if (user.role === 'SALES_OFFICER') return { salesOfficerId: user.userId };
    if (user.role === 'SALES_HEAD')
      return { salesOfficer: { reportsToId: user.userId } };
    return {};
  }

  async listDistributors(
    user: AuthenticatedUser,
    search?: string,
  ): Promise<OnboardedUserRow[]> {
    const rows = await this.prisma.distributor.findMany({
      where: {
        ...this.distributorScope(user),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        staff: {
          where: { role: 'DISTRIBUTOR' },
          take: 1,
          select: { id: true, phone: true, email: true },
        },
      },
    });
    return rows.map((d) => ({
      id: d.id,
      fullName: d.name,
      phone: d.staff[0]?.phone ?? '',
      email: d.staff[0]?.email ?? null,
      role: 'DISTRIBUTOR' as const,
      area: d.region,
      subArea: d.subArea,
      onboardedOn: d.createdAt.toISOString(),
      onboardingStatus: d.onboardingStatus,
      status: d.status,
    }));
  }

  async listRetailers(
    user: AuthenticatedUser,
    search?: string,
  ): Promise<OnboardedUserRow[]> {
    const rows = await this.prisma.retailer.findMany({
      where: {
        ...this.retailerScope(user),
        ...(search ? { shopName: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { name: true, phone: true, email: true } },
        distributor: { select: { name: true } },
        salesOfficer: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      fullName: r.user.name,
      phone: r.user.phone,
      email: r.user.email,
      role: 'RETAILER' as const,
      area: null,
      subArea: r.subArea,
      onboardedOn: r.createdAt.toISOString(),
      onboardingStatus: r.onboardingStatus,
      status: r.status,
      extra: {
        outlet: r.shopName,
        distributor: r.distributor.name,
        salesOfficer: r.salesOfficer?.name ?? null,
      },
    }));
  }

  async listStaff(
    role: 'SALES_HEAD' | 'SALES_OFFICER',
    user: AuthenticatedUser,
    search?: string,
  ): Promise<OnboardedUserRow[]> {
    const scope: Prisma.UserWhereInput =
      role === 'SALES_OFFICER' && user.role === 'SALES_HEAD'
        ? { reportsToId: user.userId }
        : {};
    const rows = await this.prisma.user.findMany({
      where: {
        role,
        ...scope,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        reportsTo: { select: { name: true } },
        _count: role === 'SALES_HEAD' ? { select: { reports: true } } : undefined,
      },
    });
    return rows.map((u) => {
      const extra: Record<string, string | number | null> =
        role === 'SALES_HEAD'
          ? { salesOfficers: (u as { _count?: { reports: number } })._count?.reports ?? 0 }
          : { reportsTo: u.reportsTo?.name ?? null };
      return {
        id: u.id,
        fullName: u.name,
        phone: u.phone,
        email: u.email,
        role,
        area: u.area,
        subArea: u.subArea,
        onboardedOn: u.createdAt.toISOString(),
        onboardingStatus: null,
        status: u.status,
        extra,
      };
    });
  }

  async updateDistributorOnboarding(id: string, input: UpdateOnboardingInput) {
    const exists = await this.prisma.distributor.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Distributor not found');
    return this.prisma.distributor.update({
      where: { id },
      data: {
        onboardingStatus: input.onboardingStatus,
        onboardingNote: input.onboardingNote ?? null,
        ...(input.status ? { status: input.status } : {}),
      },
    });
  }

  async updateRetailerOnboarding(id: string, input: UpdateOnboardingInput) {
    const exists = await this.prisma.retailer.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Retailer not found');
    return this.prisma.retailer.update({
      where: { id },
      data: {
        onboardingStatus: input.onboardingStatus,
        onboardingNote: input.onboardingNote ?? null,
        ...(input.status ? { status: input.status } : {}),
      },
    });
  }
}
