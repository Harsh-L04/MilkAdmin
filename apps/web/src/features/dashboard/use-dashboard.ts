'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: ({ signal }) => api.admin.dashboard(signal),
  });
}
