import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

/**
 * Marks a mutating route as idempotent: when the client sends an
 * `Idempotency-Key` header, a replayed request returns the original response
 * instead of executing again (guards against double-submit on retry/poor
 * network). Routes without the header behave normally.
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
