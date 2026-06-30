import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { RedisService } from '../common/redis/redis.service';

class TooManyRequestsException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

interface OtpRecord {
  hash: string;
  attempts: number;
}

/**
 * Phone OTP with defence against the usual abuse:
 *  - per-phone resend cooldown and per-phone+per-IP request rate limits
 *    (mitigates SMS-pumping / toll fraud)
 *  - hashed codes at rest (never store the plaintext OTP)
 *  - capped verification attempts with constant-time comparison
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly ttl: number;
  private readonly maxAttempts: number;
  private readonly cooldown: number;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.ttl = this.config.get<number>('OTP_TTL', 300);
    this.maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS', 5);
    this.cooldown = this.config.get<number>('OTP_RESEND_COOLDOWN', 60);
  }

  private otpKey(phone: string): string {
    return `otp:code:${phone}`;
  }

  private hash(phone: string, code: string): string {
    // Prefer a dedicated OTP key; fall back to the JWT secret for back-compat.
    const secret =
      this.config.get<string>('OTP_HMAC_SECRET') ??
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
  }

  async request(phone: string, ip: string): Promise<void> {
    // Dev mode (console SMS) skips abuse throttling so local testing isn't
    // blocked by cooldown / rate limits. Real SMS providers keep full protection.
    const devMode = this.config.get('SMS_PROVIDER') === 'console';
    const cooldownKey = `otp:cooldown:${phone}`;

    if (!devMode) {
      // Resend cooldown.
      if (await this.redis.get(cooldownKey)) {
        throw new TooManyRequestsException('Please wait before requesting a new code');
      }

      // Rate limits (per phone / per IP over a rolling hour).
      const perPhone = await this.redis.incrWithTtl(`otp:rl:phone:${phone}`, 3600);
      const perIp = await this.redis.incrWithTtl(`otp:rl:ip:${ip}`, 3600);
      if (perPhone > 5 || perIp > 20) {
        throw new TooManyRequestsException('OTP request limit exceeded');
      }
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const record: OtpRecord = { hash: this.hash(phone, code), attempts: 0 };
    await this.redis.setEx(this.otpKey(phone), JSON.stringify(record), this.ttl);
    if (!devMode) {
      await this.redis.setEx(cooldownKey, '1', this.cooldown);
    }

    // In dev we log instead of sending an SMS. Real providers wire in here.
    if (devMode) {
      this.logger.log(`[DEV] OTP for ${phone} is ${code}`);
    }
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const raw = await this.redis.get(this.otpKey(phone));
    if (!raw) {
      throw new BadRequestException('Code expired or not requested');
    }
    const record = JSON.parse(raw) as OtpRecord;

    if (record.attempts >= this.maxAttempts) {
      await this.redis.del(this.otpKey(phone));
      throw new TooManyRequestsException('Too many attempts; request a new code');
    }

    const expected = Buffer.from(record.hash, 'hex');
    const actual = Buffer.from(this.hash(phone, code), 'hex');
    const ok =
      expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!ok) {
      record.attempts += 1;
      await this.redis.setEx(
        this.otpKey(phone),
        JSON.stringify(record),
        this.ttl,
      );
      return false;
    }

    // Single-use: consume on success.
    await this.redis.del(this.otpKey(phone));
    return true;
  }
}
