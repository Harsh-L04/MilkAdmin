import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOutletLedger, useRecordCollection } from '@/features/ledger/use-ledger';
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

describe('useOutletLedger', () => {
  it('shows ledger entries', async () => {
    const ledger = { retailerId: 'r1', balance: '5000', entries: [] };
    vi.spyOn(api.ledger, 'get').mockResolvedValue(ledger as any);
    const { result } = renderHook(() => useOutletLedger('r1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ledger);
  });
});

describe('useRecordCollection', () => {
  it('records payment collection', async () => {
    const ledger = { retailerId: 'r1', balance: '0' };
    vi.spyOn(api.ledger, 'collect').mockResolvedValue(ledger as any);
    const { result } = renderHook(() => useRecordCollection(), { wrapper });
    result.current.mutate({ retailerId: 'r1', amount: '5000' } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
