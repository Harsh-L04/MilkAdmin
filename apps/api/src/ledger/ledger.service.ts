import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@moderns-milk/database';
import { RecordCollectionInput } from '@moderns-milk/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from '../common/auth/current-user.decorator';
import { canAccessRetailerResource } from '../common/authz/scope';

const Decimal = Prisma.Decimal;
type LedgerType = 'DEBIT' | 'CREDIT';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Post a ledger entry inside an existing transaction and update the running
   * balance. DEBIT increases what the outlet owes; CREDIT (payments) reduces it.
   */
  async postWithinTx(
    tx: Prisma.TransactionClient,
    retailerId: string,
    type: LedgerType,
    amount: Prisma.Decimal | string | number,
    refType: string,
    refId: string | null,
    note?: string,
  ): Promise<Prisma.Decimal> {
    let account = await tx.retailerAccount.findUnique({ where: { retailerId } });
    if (!account) {
      account = await tx.retailerAccount.create({
        data: { retailerId, balance: '0', creditLimit: '0' },
      });
    }
    const amt = new Decimal(amount);
    const balanceAfter =
      type === 'DEBIT' ? account.balance.add(amt) : account.balance.sub(amt);
    await tx.ledgerEntry.create({
      data: { retailerId, type, amount: amt, refType, refId, balanceAfter, note: note ?? null },
    });
    await tx.retailerAccount.update({
      where: { retailerId },
      data: { balance: balanceAfter },
    });
    return balanceAfter;
  }

  private async assertScope(user: AuthenticatedUser, retailerId: string) {
    const retailer = await this.prisma.retailer.findUnique({
      where: { id: retailerId },
    });
    if (!retailer) throw new NotFoundException('Outlet not found');
    if (!canAccessRetailerResource(user, retailer.id, retailer.distributorId)) {
      throw new ForbiddenException('Outlet is out of your scope');
    }
    return retailer;
  }

  async getLedger(user: AuthenticatedUser, retailerId: string) {
    const retailer = await this.assertScope(user, retailerId);
    const account = await this.prisma.retailerAccount.findUnique({
      where: { retailerId },
    });
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { retailerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      retailerId,
      outletName: retailer.shopName,
      balance: (account?.balance ?? new Decimal(0)).toString(),
      creditLimit: (account?.creditLimit ?? new Decimal(0)).toString(),
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount.toString(),
        refType: e.refType,
        refId: e.refId,
        balanceAfter: e.balanceAfter.toString(),
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async recordCollection(user: AuthenticatedUser, input: RecordCollectionInput) {
    await this.assertScope(user, input.retailerId);
    const note = [input.mode, input.note].filter(Boolean).join(' · ');
    await this.prisma.$transaction((tx) =>
      this.postWithinTx(tx, input.retailerId, 'CREDIT', input.amount, 'PAYMENT', null, note),
    );
    return this.getLedger(user, input.retailerId);
  }
}
