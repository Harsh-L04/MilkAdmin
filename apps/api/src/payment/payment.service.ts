import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreatePaymentInput,
  PaymentLogDto,
  UpdatePaymentStatusInput,
} from '@moderns-milk/contracts';
import { Prisma } from '@moderns-milk/database';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../common/auth/current-user.decorator';

const PAYMENT_INCLUDE = {
  distributor: { select: { name: true } },
  recordedBy: { select: { name: true } },
} as const;

type PaymentRow = Prisma.PaymentLogGetPayload<{ include: typeof PAYMENT_INCLUDE }>;

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: PaymentRow): PaymentLogDto {
    return {
      id: row.id,
      distributorId: row.distributorId,
      distributorName: row.distributor.name,
      orderId: row.orderId,
      amount: row.amount.toString(),
      paymentDate: row.paymentDate.toISOString(),
      mode: row.mode,
      status: row.status,
      proofImageKey: row.proofImageKey,
      note: row.note,
      recordedBy: row.recordedBy.name,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // Which distributor this payment is for, and permission to log it.
  private async resolveDistributorId(
    user: AuthenticatedUser,
    input: CreatePaymentInput,
  ): Promise<string> {
    if (user.role === 'DISTRIBUTOR') {
      if (!user.distributorId) throw new ForbiddenException('No distributor in scope');
      return user.distributorId;
    }
    // Staff logging on behalf must name the distributor.
    if (!input.distributorId) {
      throw new BadRequestException('distributorId is required');
    }
    return input.distributorId;
  }

  async create(user: AuthenticatedUser, input: CreatePaymentInput) {
    const distributorId = await this.resolveDistributorId(user, input);
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
    });
    if (!distributor) throw new NotFoundException('Distributor not found');

    const created = await this.prisma.paymentLog.create({
      data: {
        distributorId,
        orderId: input.orderId ?? null,
        recordedById: user.userId,
        amount: input.amount,
        paymentDate: new Date(input.paymentDate),
        mode: input.mode,
        proofImageKey: input.proofImageKey ?? null,
        note: input.note ?? null,
        // status defaults to PENDING; only an admin promotes to PAID.
      },
      include: PAYMENT_INCLUDE,
    });
    return this.toDto(created);
  }

  // ADMIN sees all; SH sees their officers' distributors; SO sees their
  // distributors; a DISTRIBUTOR sees only their own payments.
  private async scope(user: AuthenticatedUser): Promise<Prisma.PaymentLogWhereInput> {
    if (user.role === 'ADMIN') return {};
    if (user.role === 'DISTRIBUTOR') return { distributorId: user.distributorId ?? '__none__' };
    if (user.role === 'SALES_OFFICER')
      return { distributor: { assignedSalesOfficerId: user.userId } };
    // SALES_HEAD
    return { distributor: { assignedSalesOfficer: { reportsToId: user.userId } } };
  }

  async list(
    user: AuthenticatedUser,
    filters: { status?: string; distributorId?: string; dateFrom?: string; dateTo?: string },
  ): Promise<PaymentLogDto[]> {
    const where: Prisma.PaymentLogWhereInput = await this.scope(user);
    if (filters.status === 'PAID' || filters.status === 'PENDING') {
      where.status = filters.status;
    }
    if (filters.distributorId) where.distributorId = filters.distributorId;
    if (filters.dateFrom || filters.dateTo) {
      where.paymentDate = {};
      if (filters.dateFrom) where.paymentDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.paymentDate.lte = new Date(filters.dateTo);
    }

    const rows = await this.prisma.paymentLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: PAYMENT_INCLUDE,
    });
    return rows.map((r) => this.toDto(r));
  }

  /** Admin-only status transition (spec §6.7.1). */
  async updateStatus(id: string, input: UpdatePaymentStatusInput) {
    const exists = await this.prisma.paymentLog.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Payment not found');
    const updated = await this.prisma.paymentLog.update({
      where: { id },
      data: { status: input.status },
      include: PAYMENT_INCLUDE,
    });
    return this.toDto(updated);
  }
}
