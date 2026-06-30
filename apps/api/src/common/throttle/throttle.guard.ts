import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import {
  SKIP_THROTTLE_KEY,
  THROTTLE_KEY,
  ThrottleOptions,
} from './throttle.decorator';

/**
 * Redis-backed fixed-window rate limiter, applied globally. Reuses the same
 * incr+TTL primitive the OTP service uses, so limits are shared across all API
 * instances (unlike the in-memory default throttler). Runs before auth, so the
 * client key is the IP for unauthenticated traffic (login/OTP brute force) and
 * the user id once authenticated.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly defaults: ThrottleOptions;

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.defaults = {
      limit: config.get<number>('THROTTLE_LIMIT', 120),
      ttlSec: config.get<number>('THROTTLE_TTL', 60),
    };
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(SKIP_THROTTLE_KEY, targets)) {
      return true;
    }

    const opts =
      this.reflector.getAllAndOverride<ThrottleOptions>(THROTTLE_KEY, targets) ??
      this.defaults;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { userId?: string } | undefined;
    const clientId = user?.userId ?? req.ip ?? 'unknown';
    // Controller.handler is always available; req.route may not be at guard time.
    const route = `${ctx.getClass().name}.${ctx.getHandler().name}`;
    const key = `throttle:${route}:${clientId}`;

    const count = await this.redis.incrWithTtl(key, opts.ttlSec);
    if (count > opts.limit) {
      throw new HttpException(
        'Too many requests, please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
