import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardStats } from '@/features/dashboard/use-dashboard';
import { api } from '@/lib/api';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient.clear();
});

describe('useDashboardStats', () => {
  it('returns KPIs', async () => {
    const stats = {
      network: { distributors: 10, outlets: 50, salesReps: 5 },
      dues: { outstanding: '10000', outletsWithDues: 3 },
      visits: { count: 20, newOutlets: 2, withOrder: 15, strikeRatePct: 75 },
      topSkus: [],
    };
    vi.spyOn(api.admin, 'dashboard').mockResolvedValue(stats as any);
    const { result } = renderHook(() => useDashboardStats(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });

  it('loading state', () => {
    vi.spyOn(api.admin, 'dashboard').mockReturnValue(new Promise(() => {}) as any);
    const { result } = renderHook(() => useDashboardStats(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('error handling', async () => {
    vi.spyOn(api.admin, 'dashboard').mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() => useDashboardStats(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
