import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';
import { IDEMPOTENT_KEY } from './idempotency.decorator';

const TTL_SECONDS = 60 * 60 * 24; // replay window: 24h

interface IdemRecord {
  status: 'pending' | 'done';
  body?: unknown;
}

/**
 * Globally registered, opt-in via @Idempotent(). On a request carrying an
 * `Idempotency-Key`, the first call runs and its response is cached per
 * (user, key); replays return the cached body. A concurrent replay while the
 * first is still in flight gets 409. Failures release the claim so the client
 * can legitimately retry.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const enabled = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!enabled) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const headerKey = req.headers['idempotency-key'];
    if (!headerKey || typeof headerKey !== 'string') {
      return next.handle(); // header is optional; behave normally without it
    }

    const user = req.user as { userId?: string } | undefined;
    const storeKey = `idem:${user?.userId ?? 'anon'}:${headerKey}`;

    const existing = await this.redis.get(storeKey);
    if (existing) {
      const record = JSON.parse(existing) as IdemRecord;
      if (record.status === 'pending') {
        throw new ConflictException('A request with this key is in progress');
      }
      return of(record.body);
    }

    // Claim the key atomically; if another request claimed it first, 409.
    const pending: IdemRecord = { status: 'pending' };
    const claimed = await this.redis.raw.set(
      storeKey,
      JSON.stringify(pending),
      'EX',
      TTL_SECONDS,
      'NX',
    );
    if (claimed === null) {
      throw new ConflictException('A request with this key is in progress');
    }

    return next.handle().pipe(
      switchMap((body) => {
        const done: IdemRecord = { status: 'done', body };
        return new Observable<unknown>((subscriber) => {
          this.redis
            .setEx(storeKey, JSON.stringify(done), TTL_SECONDS)
            .finally(() => {
              subscriber.next(body);
              subscriber.complete();
            });
        });
      }),
      catchError((err) => {
        // Release the claim so a genuine retry can proceed.
        void this.redis.del(storeKey);
        return throwError(() => err);
      }),
    );
  }
}
