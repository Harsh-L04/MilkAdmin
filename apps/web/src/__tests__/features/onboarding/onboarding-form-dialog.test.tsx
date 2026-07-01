import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingFormDialog } from '@/features/onboarding/onboarding-form-dialog';
import { api } from '@/lib/api';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient.clear();
  vi.spyOn(api.onboarding, 'listDistributors').mockResolvedValue([] as any);
  vi.spyOn(api.onboarding, 'listSalesHeads').mockResolvedValue([] as any);
  vi.spyOn(api.onboarding, 'listSalesOfficers').mockResolvedValue([] as any);
});

describe('OnboardingFormDialog', () => {
  it('renders with distributor tab', () => {
    render(<OnboardingFormDialog open tab="distributors" onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText('Onboard distributor')).toBeInTheDocument();
  });

  it('renders with retailer tab', () => {
    render(<OnboardingFormDialog open tab="retailers" onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText('Onboard retailer')).toBeInTheDocument();
  });

  it('renders with staff tabs', () => {
    const { rerender } = render(
      <OnboardingFormDialog open tab="sales-heads" onClose={vi.fn()} />,
      { wrapper },
    );
    expect(screen.getByText('Onboard sales head')).toBeInTheDocument();

    rerender(<OnboardingFormDialog open tab="sales-officers" onClose={vi.fn()} />);
    expect(screen.getByText('Onboard sales officer')).toBeInTheDocument();
  });

  it('cancel closes dialog', async () => {
    const onClose = vi.fn();
    render(<OnboardingFormDialog open tab="distributors" onClose={onClose} />, { wrapper });
    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
