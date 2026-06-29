'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReviewOrderInput, AdvanceOrderInput } from '@moderns-milk/contracts';
import { api } from '@/lib/api';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: ({ signal }) => api.orders.list(signal),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: ({ signal }) => api.orders.get(id, signal),
    enabled: Boolean(id),
  });
}

/** Distributor / admin approve-or-reject action for a submitted order. */
export function useReviewOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewOrderInput) => api.orders.review(input),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.setQueryData(['orders', order.id], order);
    },
  });
}

/** Advance an approved order along the fulfillment lifecycle. */
export function useAdvanceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdvanceOrderInput) => api.orders.advance(input),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.setQueryData(['orders', order.id], order);
    },
  });
}
