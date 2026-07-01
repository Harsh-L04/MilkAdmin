import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthTokens, JwtPayload } from '@moderns-milk/contracts';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {
    this.bcryptRounds = this.config.get<number>('BCRYPT_ROUNDS', 10);
  }

  async requestOtp(phone: string, ip: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (user && user.status === 'ACTIVE') {
      await this.otp.request(phone, ip);
    }
  }

  async verifyOtp(phone: string, code: string): Promise<AuthTokens> {
    const ok = await this.otp.verify(phone, code);
    if (!ok) throw new UnauthorizedException('Invalid code');
    const payload = await this.buildPayload(phone);
    return this.tokens.issue(payload);
  }

  async login(phone: string, password: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { retailer: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Password not set. Use OTP login or contact your admin.',
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const payload = await this.buildPayload(phone);
    return this.tokens.issue(payload);
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.passwordHash) {
      const ok = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!ok) throw new UnauthorizedException('Current password is incorrect');
    }
    const hash = await bcrypt.hash(newPassword, this.bcryptRounds);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    return this.tokens.rotate(refreshToken, (userId) =>
      this.buildPayloadById(userId),
    );
  }

  async logout(userId: string): Promise<void> {
    await this.tokens.revokeAll(userId);
  }

  private async buildPayload(phone: string): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { retailer: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account not found or inactive');
    }
    return {
      sub: user.id,
      role: user.role,
      distributorId:
        user.distributorId ?? user.retailer?.distributorId ?? undefined,
      retailerId: user.retailer?.id,
    };
  }

  private async buildPayloadById(userId: string): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { retailer: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account not found or inactive');
    }
    return {
      sub: user.id,
      role: user.role,
      distributorId:
        user.distributorId ?? user.retailer?.distributorId ?? undefined,
      retailerId: user.retailer?.id,
    };
  }
}
