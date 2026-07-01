import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts, useCreateProduct, useUpdateProduct } from '@/features/catalog/use-products';
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

describe('useProducts', () => {
  it('returns products on success', async () => {
    const products = [{ id: '1', name: 'Gold Milk', active: true }];
    vi.spyOn(api.catalog, 'listProducts').mockResolvedValue(products as any);

    const { result } = renderHook(() => useProducts({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(products);
  });

  it('loading state', () => {
    vi.spyOn(api.catalog, 'listProducts').mockReturnValue(new Promise(() => {}) as any);
    const { result } = renderHook(() => useProducts({}), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('error state', async () => {
    vi.spyOn(api.catalog, 'listProducts').mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() => useProducts({}), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('empty list', async () => {
    vi.spyOn(api.catalog, 'listProducts').mockResolvedValue([]);
    const { result } = renderHook(() => useProducts({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
