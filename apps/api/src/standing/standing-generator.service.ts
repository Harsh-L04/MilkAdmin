import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { OrderingService } from '../ordering/ordering.service';
import { isWindowOpen } from '../ordering/domain/cutoff';
import { dueStandingOrders } from './domain/standing-generation';

export interface GenerationResult {
  windowsProcessed: number;
  created: number;
  skipped: number;
}

/**
 * Materializes active standing orders into real DRAFT orders for the day they
 * are due. Idempotent (re-running never duplicates) and safe to run from a
 * multi-instance cron (a short Redis lock makes the sweep single-flight).
 */
@Injectable()
export class StandingGeneratorService {
  private readonly logger = new Logger(StandingGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ordering: OrderingService,
  ) {}

  /**
   * Generate STANDING orders for a single OPEN window. Skips any retailer that
   * already has a STANDING order in this window, so it is safe to re-run.
   */
  async generateForWindow(
    windowId: string,
  ): Promise<{ created: number; skipped: number }> {
    const window = await this.prisma.orderWindow.findUnique({
      where: { id: windowId },
    });
    if (!window) throw new NotFoundException('Order window not found');
    if (window.status !== 'OPEN') return { created: 0, skipped: 0 };

    const standings = await this.prisma.standingOrder.findMany({
      where: {
        active: true,
        retailer: { distributorId: window.distributorId, status: 'ACTIVE' },
      },
      include: { items: true },
    });

    const due = dueStandingOrders(standings, window.deliveryDate);
    let created = 0;
    let skipped = 0;

    for (const s of due) {
      if (s.items.length === 0) {
        skipped++;
        continue;
      }
      const existing = await this.prisma.order.findFirst({
        where: {
          retailerId: s.retailerId,
          orderWindowId: window.id,
          source: 'STANDING',
        },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await this.ordering.createOrderFromLines({
        retailerId: s.retailerId,
        distributorId: window.distributorId,
        window: { id: window.id, deliveryDate: window.deliveryDate },
        items: s.items.map((i) => ({ productId: i.productId, qty: i.qty })),
        source: 'STANDING',
      });
      created++;
    }

    return { created, skipped };
  }

  /**
   * Sweep every OPEN, pre-cutoff window. Single-flight across instances via a
   * short Redis lock so a cron firing on multiple replicas runs only once.
   */
  async generateForAllOpenWindows(
    now: Date = new Date(),
  ): Promise<GenerationResult> {
    const lockKey = 'lock:standing-generate';
    const locked = await this.redis.raw.set(lockKey, '1', 'EX', 300, 'NX');
    if (locked === null) {
      this.logger.log('Standing generation already running elsewhere; skipping');
      return { windowsProcessed: 0, created: 0, skipped: 0 };
    }
    try {
      return await this.sweep(
        await this.prisma.orderWindow.findMany({ where: { status: 'OPEN' } }),
        now,
      );
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** Manual, distributor-scoped trigger (no global lock — already narrow). */
  async generateForDistributor(
    distributorId: string,
    now: Date = new Date(),
  ): Promise<GenerationResult> {
    return this.sweep(
      await this.prisma.orderWindow.findMany({
        where: { status: 'OPEN', distributorId },
      }),
      now,
    );
  }

  private async sweep(
    windows: { id: string; status: string; cutoffAt: Date }[],
    now: Date,
  ): Promise<GenerationResult> {
    const open = windows.filter((w) =>
      isWindowOpen({ status: w.status as 'OPEN', cutoffAt: w.cutoffAt }, now),
    );
    let created = 0;
    let skipped = 0;
    for (const w of open) {
      const r = await this.generateForWindow(w.id);
      created += r.created;
      skipped += r.skipped;
    }
    const result = { windowsProcessed: open.length, created, skipped };
    this.logger.log(`Standing generation: ${JSON.stringify(result)}`);
    return result;
  }
}
