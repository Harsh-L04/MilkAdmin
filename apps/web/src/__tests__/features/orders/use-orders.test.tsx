import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrders, useOrder, useReviewOrder, useAdvanceOrder } from '@/features/orders/use-orders';
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

describe('useOrders', () => {
  it('lists orders', async () => {
    const orders = [{ id: '1', status: 'DRAFT' }];
    vi.spyOn(api.orders, 'list').mockResolvedValue(orders as any);
    const { result } = renderHook(() => useOrders(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(orders);
  });

  it('empty state', async () => {
    vi.spyOn(api.orders, 'list').mockResolvedValue([]);
    const { result } = renderHook(() => useOrders(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useOrder', () => {
  it('gets order by ID', async () => {
    const order = { id: '1', status: 'DRAFT' };
    vi.spyOn(api.orders, 'get').mockResolvedValue(order as any);
    const { result } = renderHook(() => useOrder('1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(order);
  });
});

describe('useReviewOrder', () => {
  it('mutates approve/reject', async () => {
    vi.spyOn(api.orders, 'review').mockResolvedValue({ id: '1', status: 'APPROVED' } as any);
    const { result } = renderHook(() => useReviewOrder(), { wrapper });
    result.current.mutate({ orderId: '1', decision: 'APPROVE' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
