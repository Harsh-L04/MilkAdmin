import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../src/common/auth/roles.guard';

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

function createMockContext(userRole?: string) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { userId: 'u1', role: userRole } : undefined,
      }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new RolesGuard(mockReflector as any);
  });

  it('allows when no roles are required (permissive default)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(createMockContext('ADMIN'))).toBe(true);
  });

  it('allows when empty roles array (permissive default)', () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(createMockContext('ADMIN'))).toBe(true);
  });

  it('allows when user role matches required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(createMockContext('ADMIN'))).toBe(true);
  });

  it('blocks when user role does not match', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(createMockContext('RETAILER'))).toThrow(
      ForbiddenException,
    );
  });

  it('blocks when no user on request', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(createMockContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('allows when user has one of multiple required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      'ADMIN',
      'SALES_HEAD',
    ]);
    expect(guard.canActivate(createMockContext('SALES_HEAD'))).toBe(true);
  });

  it('blocks when user role is not in the allowed set', () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      'ADMIN',
      'SALES_HEAD',
    ]);
    expect(() => guard.canActivate(createMockContext('RETAILER'))).toThrow(
      ForbiddenException,
    );
  });
});
