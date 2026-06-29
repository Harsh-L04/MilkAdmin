'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ListProductsQuery,
  UpdateProductInput,
  UpsertProductInput,
} from '@moderns-milk/contracts';
import { api } from '@/lib/api';

export function useProducts(query: ListProductsQuery = {}) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: ({ signal }) => api.catalog.listProducts(query, signal),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertProductInput) => api.catalog.createProduct(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      api.catalog.updateProduct(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
