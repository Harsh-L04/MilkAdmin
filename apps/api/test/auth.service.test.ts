import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockOtp = {
  request: vi.fn(),
  verify: vi.fn(),
};

const mockTokens = {
  issue: vi.fn(),
  rotate: vi.fn(),
  revokeAll: vi.fn(),
};

const mockConfig = {
  get: vi.fn((key: string, defaultValue?: number) =>
    key === 'BCRYPT_ROUNDS' ? 10 : defaultValue,
  ),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      mockPrisma as any,
      mockOtp as any,
      mockTokens as any,
      mockConfig as any,
    );
  });

  describe('requestOtp', () => {
    it('calls otp.request when user is found and active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        phone: '+919876543210',
        status: 'ACTIVE',
      });
      await service.requestOtp('+919876543210', '127.0.0.1');
      expect(mockOtp.request).toHaveBeenCalledWith('+919876543210', '127.0.0.1');
    });

    it('does nothing when user is not found (no enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await service.requestOtp('+919876543210', '127.0.0.1');
      expect(mockOtp.request).not.toHaveBeenCalled();
    });

    it('does nothing when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        phone: '+919876543210',
        status: 'INACTIVE',
      });
      await service.requestOtp('+919876543210', '127.0.0.1');
      expect(mockOtp.request).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('issues tokens when code is valid', async () => {
      mockOtp.verify.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        phone: '+919876543210',
        status: 'ACTIVE',
        role: 'RETAILER',
        distributorId: null,
        retailer: { id: 'r1', distributorId: 'd1' },
      });
      mockTokens.issue.mockResolvedValue({
        accessToken: 'at1',
        refreshToken: 'rt1',
        expiresIn: 900,
      });
      const result = await service.verifyOtp('+919876543210', '123456');
      expect(result.accessToken).toBe('at1');
      expect(mockOtp.verify).toHaveBeenCalledWith('+919876543210', '123456');
    });

    it('throws UnauthorizedException when code is invalid', async () => {
      mockOtp.verify.mockResolvedValue(false);
      await expect(
        service.verifyOtp('+919876543210', '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    const activeUser = {
      id: 'u1',
      phone: '+919876543210',
      status: 'ACTIVE',
      role: 'DISTRIBUTOR',
      distributorId: 'd1',
      passwordHash: '$2a$10$hashed',
      retailer: null,
    };

    it('issues tokens for valid credentials', async () => {
      const bcryptMock = vi.mocked(bcrypt.compare);
      bcryptMock.mockResolvedValue(true as never);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(activeUser)
        .mockResolvedValueOnce(activeUser);
      mockTokens.issue.mockResolvedValue({
        accessToken: 'at1',
        refreshToken: 'rt1',
        expiresIn: 900,
      });

      const result = await service.login('+919876543210', 'password');
      expect(result.accessToken).toBe('at1');
    });

    it('throws when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login('+919876543210', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        status: 'INACTIVE',
      });
      await expect(
        service.login('+919876543210', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when user has no passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        passwordHash: null,
      });
      await expect(
        service.login('+919876543210', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when password does not match', async () => {
      const bcryptMock = vi.mocked(bcrypt.compare);
      bcryptMock.mockResolvedValue(false as never);
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      await expect(
        service.login('+919876543210', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    const userWithHash = {
      id: 'u1',
      passwordHash: '$2a$10$old',
    };

    it('changes password when old password is correct', async () => {
      const bcryptCompare = vi.mocked(bcrypt.compare);
      const bcryptHash = vi.mocked(bcrypt.hash);
      bcryptCompare.mockResolvedValue(true as never);
      bcryptHash.mockResolvedValue('$2a$10$new' as never);
      mockPrisma.user.findUnique.mockResolvedValue(userWithHash);

      await service.changePassword('u1', 'old', 'new');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: '$2a$10$new' },
      });
    });

    it('throws when old password is wrong', async () => {
      const bcryptCompare = vi.mocked(bcrypt.compare);
      bcryptCompare.mockResolvedValue(false as never);
      mockPrisma.user.findUnique.mockResolvedValue(userWithHash);

      await expect(
        service.changePassword('u1', 'wrong', 'new'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword('u1', 'old', 'new'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('delegates to token service', async () => {
      mockTokens.rotate.mockResolvedValue({
        accessToken: 'at2',
        refreshToken: 'rt2',
        expiresIn: 900,
      });
      const result = await service.refresh('old-refresh-token');
      expect(result.accessToken).toBe('at2');
    });
  });

  describe('logout', () => {
    it('revokes all tokens for the user', async () => {
      await service.logout('u1');
      expect(mockTokens.revokeAll).toHaveBeenCalledWith('u1');
    });
  });
});
