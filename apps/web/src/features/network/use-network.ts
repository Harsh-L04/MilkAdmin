'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateCustomerInput } from '@moderns-milk/contracts';
import { api } from '@/lib/api';

export function useDistributors() {
  return useQuery({
    queryKey: ['admin', 'distributors'],
    queryFn: ({ signal }) => api.admin.distributors(signal),
  });
}

export function useRetailers() {
  return useQuery({
    queryKey: ['admin', 'retailers'],
    queryFn: ({ signal }) => api.admin.retailers(signal),
  });
}

export function useUpdateRetailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerInput }) =>
      api.retailers.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'retailers'] }),
  });
}
