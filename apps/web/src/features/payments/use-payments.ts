'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePaymentInput,
  UpdatePaymentStatusInput,
} from '@moderns-milk/contracts';
import { api } from '@/lib/api';

export function usePayments(filters: { status?: string; distributorId?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: ({ signal }) => api.payments.list(filters, signal),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => api.payments.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePaymentStatusInput }) =>
      api.payments.updateStatus(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
