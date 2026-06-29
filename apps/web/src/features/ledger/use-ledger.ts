'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecordCollectionInput } from '@moderns-milk/contracts';
import { api } from '@/lib/api';

export function useOutletLedger(retailerId: string) {
  return useQuery({
    queryKey: ['ledger', retailerId],
    queryFn: ({ signal }) => api.ledger.get(retailerId, signal),
    enabled: Boolean(retailerId),
  });
}

export function useRecordCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordCollectionInput) => api.ledger.collect(input),
    onSuccess: (ledger) => {
      qc.setQueryData(['ledger', ledger.retailerId], ledger);
      qc.invalidateQueries({ queryKey: ['admin', 'retailers'] });
    },
  });
}
