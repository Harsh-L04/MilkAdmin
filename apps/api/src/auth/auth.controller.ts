import {
  Body,
  Controller,
  HttpCode,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  RequestOtpInput,
  VerifyOtpInput,
  RefreshInput,
  AuthTokens,
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
} from '@moderns-milk/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Public } from '../common/auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/auth/current-user.decorator';
import { Throttle } from '../common/throttle/throttle.decorator';
import { AuthService } from './auth.service';

/** Name of the httpOnly refresh cookie used by browser clients. */
const REFRESH_COOKIE = 'mm_rt';

@Controller('auth')
export class AuthController {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.refreshTtlMs =
      config.get<number>('JWT_REFRESH_TTL', 2592000) * 1000;
  }

  @Public()
  @Throttle({ limit: 5, ttlSec: 60 })
  @Post('otp/request')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(requestOtpSchema))
  async requestOtp(@Body() body: RequestOtpInput, @Ip() ip: string) {
    await this.auth.requestOtp(body.phone, ip);
    // Always 200 with a neutral message (no user enumeration).
    return { message: 'If the number is registered, a code has been sent.' };
  }

  @Public()
  @Throttle({ limit: 10, ttlSec: 60 })
  @Post('otp/verify')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(verifyOtpSchema))
  async verifyOtp(
    @Body() body: VerifyOtpInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.auth.verifyOtp(body.phone, body.code);
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Throttle({ limit: 30, ttlSec: 60 })
  @Post('refresh')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(refreshSchema))
  async refresh(
    @Body() body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    // Body token (native clients) or httpOnly cookie (browser) — one is required.
    const token = body.refreshToken ?? this.readCookie(req, REFRESH_COOKIE);
    if (!token) throw new UnauthorizedException('Missing refresh token');

    const tokens = await this.auth.refresh(token);
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user.userId);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  // -- cookie helpers ---------------------------------------------------------

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      // Secure requires HTTPS; disable in dev so localhost (http) keeps working.
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.refreshTtlMs,
    });
  }

  /** Minimal cookie reader (avoids a cookie-parser dependency). */
  private readCookie(req: Request, name: string): string | undefined {
    const raw = req.headers?.cookie;
    if (!raw) return undefined;
    for (const part of raw.split(';')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      if (part.slice(0, eq).trim() === name) {
        return decodeURIComponent(part.slice(eq + 1).trim());
      }
    }
    return undefined;
  }
}
