import { describe, it, expect, beforeEach } from 'vitest';
import { setTokens, getTokens, clearTokens, decodeSession } from '@/lib/tokens';

const STORAGE_KEY = 'mm.auth.tokens';

beforeEach(() => {
  localStorage.clear();
  // Clear the module cache by calling clearTokens which sets cache to null
  clearTokens();
});

describe('setTokens / getTokens', () => {
  it('stores access + refresh tokens', () => {
    setTokens({ accessToken: 'access-123', refreshToken: 'refresh-456' });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBe(JSON.stringify({ accessToken: 'access-123', refreshToken: 'refresh-456' }));
  });

  it('returns parsed tokens', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: 'acc', refreshToken: 'ref' }));
    expect(getTokens()).toEqual({ accessToken: 'acc', refreshToken: 'ref' });
  });

  it('returns null when no tokens stored', () => {
    expect(getTokens()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid{json');
    expect(getTokens()).toBeNull();
  });
});

describe('clearTokens', () => {
  it('removes from storage and clears cache', () => {
    setTokens({ accessToken: 'a', refreshToken: 'b' });
    clearTokens();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getTokens()).toBeNull();
  });
});

describe('decodeSession', () => {
  it('decodes JWT payload', () => {
    const payload = { sub: 'user-1', role: 'ADMIN', exp: 9999999999 };
    const b64 = btoa(JSON.stringify(payload));
    const token = `header.${b64}.signature`;
    const session = decodeSession(token);
    expect(session).toEqual(payload);
  });

  it('returns null for invalid token', () => {
    expect(decodeSession('not-a-jwt')).toBeNull();
    expect(decodeSession('a.b.c')).toBeNull();
  });
});
