import { SetMetadata } from '@nestjs/common';

export interface ThrottleOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  ttlSec: number;
}

export const THROTTLE_KEY = 'throttle';
export const SKIP_THROTTLE_KEY = 'skipThrottle';

/** Override the default rate limit for a route or controller. */
export const Throttle = (opts: ThrottleOptions) =>
  SetMetadata(THROTTLE_KEY, opts);

/** Exempt a route or controller from rate limiting (e.g. health checks). */
export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE_KEY, true);
