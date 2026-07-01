import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrderSummary } from '@/features/reports/use-order-summary';
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

describe('useOrderSummary', () => {
  it('returns summary for date range', async () => {
    const summary = { totalOrders: 100, totalValue: '50000' };
    vi.spyOn(api.reports, 'orderSummary').mockResolvedValue(summary as any);
    const { result } = renderHook(() => useOrderSummary('2024-01-01'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
  });
});
