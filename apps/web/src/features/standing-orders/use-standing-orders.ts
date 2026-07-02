'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpsertStandingOrderInput } from '@moderns-milk/contracts';
import { api } from '@/lib/api';

export function useStandingOrders() {
  return useQuery({
    queryKey: ['standing-orders'],
    queryFn: ({ signal }) => api.standingOrders.list(signal),
  });
}

export function useCreateStandingOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertStandingOrderInput) => api.standingOrders.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['standing-orders'] }),
  });
}

export function useUpdateStandingOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertStandingOrderInput }) =>
      api.standingOrders.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['standing-orders'] }),
  });
}

export function useDeleteStandingOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.standingOrders.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['standing-orders'] }),
  });
}
