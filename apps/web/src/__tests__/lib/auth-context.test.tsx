import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import * as tokens from '@/lib/tokens';

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="ready">{String(auth.ready)}</span>
      <span data-testid="auth">{String(auth.isAuthenticated)}</span>
      <span data-testid="role">{auth.role ?? 'none'}</span>
      <button data-testid="logout" onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  tokens.clearTokens();
});

describe('AuthProvider', () => {
  it('authenticated from stored tokens', async () => {
    localStorage.setItem('mm.auth.tokens', JSON.stringify({
      accessToken: 'valid-token',
      refreshToken: 'valid-refresh',
    }));

    const decoded = { sub: 'user-1', role: 'ADMIN' };
    vi.spyOn(tokens, 'decodeSession').mockReturnValue(decoded);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('true'));
    expect(screen.getByTestId('role').textContent).toBe('ADMIN');
  });

  it('unauthenticated when no tokens', async () => {
    vi.spyOn(tokens, 'getTokens').mockReturnValue(null);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });
});

describe('AuthProvider with verifyOtp', () => {
  it('verifyOtp gets tokens and sets session', async () => {
    const authTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
    vi.spyOn(api.auth, 'verifyOtp').mockResolvedValue(authTokens);
    vi.spyOn(tokens, 'decodeSession').mockReturnValue({ sub: 'user-1', role: 'DISTRIBUTOR' });

    function TestVerify() {
      const auth = useAuth();
      return (
        <div>
          <span data-testid="role">{auth.role ?? 'none'}</span>
          <button
            data-testid="verify"
            onClick={() => auth.verifyOtp('+919999999999', '123456')}
          >
            Verify
          </button>
        </div>
      );
    }

    render(<AuthProvider><TestVerify /></AuthProvider>);
    await userEvent.click(screen.getByTestId('verify'));
    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('DISTRIBUTOR'));
  });
});

describe('AuthProvider logout', () => {
  it('logout clears tokens and redirects', async () => {
    localStorage.setItem('mm.auth.tokens', JSON.stringify({
      accessToken: 'valid',
      refreshToken: 'valid',
    }));
    vi.spyOn(tokens, 'decodeSession').mockReturnValue({ sub: 'u1', role: 'ADMIN' });
    vi.spyOn(api.auth, 'logout').mockResolvedValue(undefined);
    vi.spyOn(tokens, 'getTokens').mockReturnValue({
      accessToken: 'valid',
      refreshToken: 'valid',
    });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('true'));

    await userEvent.click(screen.getByTestId('logout'));
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('false'));
  });
});
