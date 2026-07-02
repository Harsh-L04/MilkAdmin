import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrderDeadline, useSetOrderDeadline } from '@/features/settings/use-settings';
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

describe('useOrderDeadline', () => {
  it('gets deadline', async () => {
    const deadline = { time: '14:00' };
    vi.spyOn(api.settings, 'getOrderDeadline').mockResolvedValue(deadline);
    const { result } = renderHook(() => useOrderDeadline(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deadline);
  });
});

describe('useSetOrderDeadline', () => {
  it('updates deadline', async () => {
    vi.spyOn(api.settings, 'setOrderDeadline').mockResolvedValue({ time: '15:00' });
    const { result } = renderHook(() => useSetOrderDeadline(), { wrapper });
    result.current.mutate({ time: '15:00' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
