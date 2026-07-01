'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderDeadlineInput } from '@moderns-milk/contracts';
import { api } from '@/lib/api';

export function useOrderDeadline() {
  return useQuery({
    queryKey: ['order-deadline'],
    queryFn: ({ signal }) => api.settings.getOrderDeadline(signal),
  });
}

export function useSetOrderDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderDeadlineInput) => api.settings.setOrderDeadline(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order-deadline'] }),
  });
}
