import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSalesVisits } from '@/features/sales-visits/use-sales-visits';
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

describe('useSalesVisits', () => {
  it('lists sales visits', async () => {
    const visits = [{ id: 'v1', salesOfficer: 'Officer A' }];
    vi.spyOn(api.salesVisits, 'list').mockResolvedValue(visits as any);
    const { result } = renderHook(() => useSalesVisits(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(visits);
  });
});
