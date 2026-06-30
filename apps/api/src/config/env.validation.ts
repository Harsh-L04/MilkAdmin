import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().int().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().default(2592000),
  OTP_TTL: z.coerce.number().int().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().default(5),
  OTP_RESEND_COOLDOWN: z.coerce.number().int().default(60),
  // Dedicated key for hashing OTPs at rest. Falls back to JWT_ACCESS_SECRET if
  // unset so existing deploys keep working; set a distinct value in production.
  OTP_HMAC_SECRET: z.string().min(16).optional(),
  SMS_PROVIDER: z.enum(['console', 'twilio', 'msg91']).default('console'),
  // Global rate limit: max requests per client per window (seconds), per route.
  THROTTLE_LIMIT: z.coerce.number().int().default(120),
  THROTTLE_TTL: z.coerce.number().int().default(60),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${detail}`);
  }
  return parsed.data;
}
