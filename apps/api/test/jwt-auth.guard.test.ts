import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/common/auth/jwt-auth.guard';

const mockJwt = {
  verifyAsync: vi.fn(),
};

const mockConfig = {
  getOrThrow: vi.fn().mockReturnValue('secret'),
};

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

function createMockContext(
  handlerOverrides: Record<string, any> = {},
  classOverrides: Record<string, any> = {},
  authorization?: string,
) {
  return {
    getHandler: () => handlerOverrides,
    getClass: () => classOverrides,
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization },
      }),
    }),
  } as any;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new JwtAuthGuard(
      mockJwt as any,
      mockConfig as any,
      mockReflector as any,
    );
  });

  it('allows request when @Public() is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(createMockContext());
    expect(result).toBe(true);
  });

  it('allows request with valid token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockJwt.verifyAsync.mockResolvedValue({
      sub: 'u1',
      role: 'ADMIN',
    });
    const ctx = createMockContext({}, {}, 'Bearer valid-token');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('throws UnauthorizedException when token is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createMockContext({}, {}, undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when auth header has no Bearer prefix', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createMockContext({}, {}, 'Basic token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is invalid/expired', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockJwt.verifyAsync.mockRejectedValue(new Error('expired'));
    const ctx = createMockContext({}, {}, 'Bearer bad-token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
