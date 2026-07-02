import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSampleOrders, useCreateSampleOrder } from '@/features/sample-orders/use-sample-orders';
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

describe('useSampleOrders', () => {
  it('lists sample orders', async () => {
    const orders = [{ id: 's1', product: 'Milk' }];
    vi.spyOn(api.sampleOrders, 'list').mockResolvedValue(orders as any);
    const { result } = renderHook(() => useSampleOrders({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(orders);
  });

  it('filters by date', async () => {
    vi.spyOn(api.sampleOrders, 'list').mockResolvedValue([]);
    renderHook(() => useSampleOrders({ date: '2024-01-01' }), { wrapper });
    await waitFor(() => expect(api.sampleOrders.list).toHaveBeenCalledWith(
      { date: '2024-01-01' },
      expect.any(AbortSignal),
    ));
  });
});

describe('useCreateSampleOrder', () => {
  it('creates sample order', async () => {
    vi.spyOn(api.sampleOrders, 'create').mockResolvedValue({ id: 's1' } as any);
    const { result } = renderHook(() => useCreateSampleOrder(), { wrapper });
    result.current.mutate({ targetType: 'DISTRIBUTOR' } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
