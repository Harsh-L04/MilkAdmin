import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDistributors, useRetailers, useUpdateRetailer } from '@/features/network/use-network';
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

describe('useDistributors', () => {
  it('lists distributors', async () => {
    const distributors = [{ id: 'd1', name: 'Dist A' }];
    vi.spyOn(api.admin, 'distributors').mockResolvedValue(distributors as any);
    const { result } = renderHook(() => useDistributors(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(distributors);
  });
});

describe('useRetailers', () => {
  it('lists retailers', async () => {
    const retailers = [{ id: 'r1', outletName: 'Shop A' }];
    vi.spyOn(api.admin, 'retailers').mockResolvedValue(retailers as any);
    const { result } = renderHook(() => useRetailers(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(retailers);
  });
});
