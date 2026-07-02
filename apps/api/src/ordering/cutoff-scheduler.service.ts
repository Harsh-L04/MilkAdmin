import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { shouldLock } from './domain/cutoff';

/**
 * Periodic sweep that locks order windows whose cutoff has passed.
 * Uses a short Redis lock so only one instance runs the sweep at a time.
 */
@Injectable()
export class CutoffSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CutoffSchedulerService.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    const ms = Number(process.env['CUTOFF_POLL_MS'] ?? 60_000);
    this.intervalHandle = setInterval(() => this.tick(), ms);
    this.logger.log(`Cutoff scheduler active, polling every ${ms}ms`);
    // Run once immediately on startup.
    void this.tick();
  }

  private async tick(): Promise<void> {
    try {
      await this.lockOverdueWindows();
    } catch (err) {
      this.logger.error('Cutoff sweep failed', err);
    }
  }

  async lockOverdueWindows(): Promise<number> {
    const lockKey = 'lock:cutoff-sweep';
    const locked = await this.redis.raw.set(lockKey, '1', 'EX', 120, 'NX');
    if (locked === null) {
      this.logger.debug('Cutoff sweep already running elsewhere; skipping');
      return 0;
    }
    try {
      const now = new Date();
      const overdue = await this.prisma.orderWindow.findMany({
        where: {
          status: 'OPEN',
          cutoffAt: { lte: now },
        },
        select: { id: true, cutoffAt: true },
      });

      if (overdue.length === 0) return 0;

      const ids = overdue.map((w) => w.id);
      const { count } = await this.prisma.orderWindow.updateMany({
        where: { id: { in: ids } },
        data: { status: 'LOCKED' },
      });

      this.logger.log(`Locked ${count} overdue order window(s)`);
      return count;
    } finally {
      await this.redis.del(lockKey).catch(() => {});
    }
  }
}
