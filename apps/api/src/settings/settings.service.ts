import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrderDeadlineDto } from '@moderns-milk/contracts';
import { PrismaService } from '../common/prisma/prisma.service';

const ORDER_DEADLINE_KEY = 'orderPlacementDeadline';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async get(key: string): Promise<string | null> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  private async set(key: string, value: string): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async getOrderDeadline(): Promise<OrderDeadlineDto> {
    const time = await this.get(ORDER_DEADLINE_KEY);
    return { time: time && time.length > 0 ? time : null };
  }

  async setOrderDeadline(time: string): Promise<OrderDeadlineDto> {
    await this.set(ORDER_DEADLINE_KEY, time);
    return { time: time.length > 0 ? time : null };
  }

  /**
   * Guard used at order submission (spec §8.2). Throws if a deadline is set and
   * the current local time is past it. No deadline configured => always allowed.
   */
  async assertBeforeOrderDeadline(now = new Date()): Promise<void> {
    const time = await this.get(ORDER_DEADLINE_KEY);
    if (!time) return;
    const [h = 0, m = 0] = time.split(':').map(Number);
    const cutoff = new Date(now);
    cutoff.setHours(h, m, 0, 0);
    if (now > cutoff) {
      throw new ForbiddenException(
        `Order placement deadline (${time}) has passed for today`,
      );
    }
  }
}
