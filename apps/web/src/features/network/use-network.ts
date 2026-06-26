'use client';

import { useQuery } from '@tanstack/react-query';
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
