'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  OnboardDistributorInput,
  OnboardRetailerInput,
  OnboardStaffInput,
} from '@moderns-milk/contracts';
import { api } from '@/lib/api';

export type UserTab = 'distributors' | 'retailers' | 'sales-heads' | 'sales-officers';

const listFor = {
  distributors: api.onboarding.listDistributors,
  retailers: api.onboarding.listRetailers,
  'sales-heads': api.onboarding.listSalesHeads,
  'sales-officers': api.onboarding.listSalesOfficers,
} as const;

export function useOnboardedUsers(tab: UserTab, search: string) {
  return useQuery({
    queryKey: ['onboarding', tab, search],
    queryFn: ({ signal }) => listFor[tab](search || undefined, signal),
  });
}

export function useOnboardDistributor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardDistributorInput) =>
      api.onboarding.onboardDistributor(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding'] }),
  });
}

export function useOnboardRetailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardRetailerInput) => api.onboarding.onboardRetailer(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding'] }),
  });
}

export function useOnboardStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardStaffInput) => api.onboarding.onboardStaff(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding'] }),
  });
}
