import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductFormDialog } from '@/features/catalog/product-form-dialog';
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
});

describe('ProductFormDialog', () => {
  it('shows create mode', () => {
    render(<ProductFormDialog open product={null} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText('Add product')).toBeInTheDocument();
  });

  it('shows edit mode with pre-filled values', () => {
    const product = {
      id: 'p1',
      name: 'Gold Milk',
      sku: 'GOLD-1L',
      category: 'MILK' as const,
      uom: 'LITRE' as const,
      packSize: '1',
      taxRate: '5',
      hsnCode: '0401',
      shelfLifeDays: 2,
      isReturnablePack: false,
      active: true,
      orderUnit: 'UNIT' as const,
      minOrderQty: '1',
      maxOrderQty: '100',
      unitPrice: '60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<ProductFormDialog open product={product as any} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByText('Edit product')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gold Milk')).toBeInTheDocument();
    expect(screen.getByDisplayValue('GOLD-1L')).toBeInTheDocument();
  });

  it('cancel closes dialog', async () => {
    const onClose = vi.fn();
    render(<ProductFormDialog open product={null} onClose={onClose} />, { wrapper });
    await userEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
