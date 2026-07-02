import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePayments, useCreatePayment, useUpdatePaymentStatus } from '@/features/payments/use-payments';
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

describe('usePayments', () => {
  it('lists payments', async () => {
    const payments = [{ id: 'p1', amount: '5000' }];
    vi.spyOn(api.payments, 'list').mockResolvedValue(payments as any);
    const { result } = renderHook(() => usePayments({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payments);
  });

  it('filters by status', async () => {
    vi.spyOn(api.payments, 'list').mockResolvedValue([]);
    renderHook(() => usePayments({ status: 'PENDING' }), { wrapper });
    await waitFor(() => expect(api.payments.list).toHaveBeenCalledWith(
      { status: 'PENDING' },
      expect.any(AbortSignal),
    ));
  });
});

describe('useCreatePayment', () => {
  it('creates payment', async () => {
    vi.spyOn(api.payments, 'create').mockResolvedValue({ id: 'p1' } as any);
    const { result } = renderHook(() => useCreatePayment(), { wrapper });
    result.current.mutate({ amount: '5000', mode: 'UPI' } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
