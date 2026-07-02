import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewDialog } from '@/features/orders/review-dialog';
import { api } from '@/lib/api';
import { Toaster } from '@/components/ui/toaster';
import type { OrderDto } from '@/lib/api';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

const mockOrder: OrderDto = {
  id: 'order-123456',
  retailerId: 'r1',
  distributorId: 'd1',
  orderWindowId: 'w1',
  deliveryDate: '2024-03-15',
  status: 'SUBMITTED',
  source: 'MANUAL',
  approvalType: null,
  approvedById: null,
  subtotal: '500',
  taxTotal: '50',
  total: '550',
  items: [{ id: 'i1', orderId: '1', productId: 'p1', unitPrice: '50', qtyOrdered: '10', qtyApproved: null, qtyDispatched: null, qtyDelivered: null, qtyReturned: '0', returnReason: null }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  queryClient.clear();
});

describe('ReviewDialog', () => {
  it('shows approve dialog', () => {
    render(<ReviewDialog order={mockOrder} decision="APPROVE" onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText(/Approve this order/i)).toBeInTheDocument();
  });

  it('shows reject dialog', () => {
    render(<ReviewDialog order={mockOrder} decision="REJECT" onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText(/Reject this order/i)).toBeInTheDocument();
  });

  it('approve flow calls API', async () => {
    vi.spyOn(api.orders, 'review').mockResolvedValue(mockOrder as any);
    const onClose = vi.fn();

    render(<ReviewDialog order={mockOrder} decision="APPROVE" onClose={onClose} />, { wrapper });

    await userEvent.click(screen.getByText('Approve order'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('reject with reason', async () => {
    vi.spyOn(api.orders, 'review').mockResolvedValue(mockOrder as any);
    const onClose = vi.fn();

    render(<ReviewDialog order={mockOrder} decision="REJECT" onClose={onClose} />, { wrapper });

    const textarea = screen.getByPlaceholderText('Add an internal note…');
    await userEvent.type(textarea, 'Stock unavailable');
    await userEvent.click(screen.getByText('Reject order'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('loading state during submission', async () => {
    vi.spyOn(api.orders, 'review').mockImplementation(() => new Promise(() => {}));

    render(<ReviewDialog order={mockOrder} decision="APPROVE" onClose={vi.fn()} />, { wrapper });

    await userEvent.click(screen.getByText('Approve order'));
    expect(screen.getByRole('button', { name: /Approve order/i })).toBeDisabled();
  });

  it('shows error on failure', async () => {
    vi.spyOn(api.orders, 'review').mockRejectedValue(new Error('API Error'));
    const onClose = vi.fn();

    render(<ReviewDialog order={mockOrder} decision="APPROVE" onClose={onClose} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: /Approve order/i }));
    await waitFor(() => expect(screen.getByText('Action failed')).toBeInTheDocument());
  });
});
