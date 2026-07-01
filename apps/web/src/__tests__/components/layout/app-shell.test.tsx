import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/layout/app-shell';
import * as auth from '@/lib/auth-context';
import * as tokens from '@/lib/tokens';

vi.mock('@/lib/auth-context', async () => {
  const actual = await vi.importActual('@/lib/auth-context');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(auth.useAuth).mockReset();
  });

  it('shows loading skeleton when not ready', () => {
    vi.mocked(auth.useAuth).mockReturnValue({
      ready: false,
      isAuthenticated: false,
      session: null,
      role: null,
      verifyOtp: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = render(<AppShell><div>Content</div></AppShell>);
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);
  });

  it('renders children when authenticated', () => {
    vi.mocked(auth.useAuth).mockReturnValue({
      ready: true,
      isAuthenticated: true,
      session: { sub: 'u1', role: 'ADMIN' },
      role: 'ADMIN',
      verifyOtp: vi.fn(),
      logout: vi.fn(),
    });

    render(<AppShell><div>Dashboard Content</div></AppShell>);
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
