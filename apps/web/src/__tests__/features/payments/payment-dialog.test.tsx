import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentDialog } from '@/features/payments/payment-dialog';
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
  vi.spyOn(api.onboarding, 'listDistributors').mockResolvedValue([
    { id: 'd1', fullName: 'Distributor A' },
  ] as any);
});

describe('PaymentDialog', () => {
  it('renders form fields', () => {
    render(<PaymentDialog open onClose={vi.fn()} />, { wrapper });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cancel closes dialog', async () => {
    const onClose = vi.fn();
    render(<PaymentDialog open onClose={onClose} />, { wrapper });
    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation error when distributor not selected', async () => {
    vi.spyOn(api.payments, 'create').mockResolvedValue({ id: 'p1' } as any);
    vi.spyOn(api.onboarding, 'listDistributors').mockResolvedValue([
      { id: 'd1', fullName: 'Distributor A' },
    ] as any);
    const onClose = vi.fn();

    render(<PaymentDialog open onClose={onClose} />, { wrapper });

    const amountInput = screen.getByPlaceholderText('0.00');
    await userEvent.type(amountInput, '5000');

    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    await waitFor(() => {
      expect(screen.getByText('Select a distributor')).toBeInTheDocument();
    });
  });
});
