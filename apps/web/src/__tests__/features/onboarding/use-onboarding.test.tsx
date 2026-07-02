import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useOnboardedUsers,
  useOnboardDistributor,
} from '@/features/onboarding/use-onboarding';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  mockListDistributors: vi.fn(),
  mockListRetailers: vi.fn(),
  mockOnboardDistributor: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    onboarding: {
      listDistributors: mocks.mockListDistributors,
      listRetailers: mocks.mockListRetailers,
      listSalesHeads: vi.fn().mockResolvedValue([]),
      listSalesOfficers: vi.fn().mockResolvedValue([]),
      onboardDistributor: mocks.mockOnboardDistributor,
      onboardRetailer: vi.fn(),
      onboardStaff: vi.fn(),
      updateDistributorStatus: vi.fn(),
      updateRetailerStatus: vi.fn(),
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('useOnboardedUsers', () => {
  it('lists prospective users', async () => {
    const users = [{ id: 'u1', fullName: 'John' }];
    mocks.mockListDistributors.mockResolvedValue(users);
    const { result } = renderHook(() => useOnboardedUsers('distributors', ''), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(users);
  });

  it('search filters users', async () => {
    mocks.mockListRetailers.mockResolvedValue([]);
    renderHook(() => useOnboardedUsers('retailers', 'test'), { wrapper });
    await waitFor(() => expect(mocks.mockListRetailers).toHaveBeenCalledWith(
      'test',
      expect.any(AbortSignal),
    ));
  });
});

describe('useOnboardDistributor', () => {
  it('onboards distributor', async () => {
    mocks.mockOnboardDistributor.mockResolvedValue({ id: 'd1' });
    const { result } = renderHook(() => useOnboardDistributor(), { wrapper });
    result.current.mutate({ fullName: 'Test', phone: '+919999999999' } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
