'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSalesVisits(filters: { dateFrom?: string; dateTo?: string; outletType?: string } = {}) {
  return useQuery({
    queryKey: ['sales-visits', filters],
    queryFn: ({ signal }) => api.salesVisits.list(filters, signal),
  });
}
