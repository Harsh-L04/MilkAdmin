import { describe, it, expect } from 'vitest';
import { deriveDashboard } from '@/features/dashboard/metrics';
import type { OrderDto } from '@/lib/api';
import type { ProductDto } from '@moderns-milk/contracts';

function makeOrder(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: '1',
    retailerId: 'r1',
    distributorId: 'd1',
    orderWindowId: 'w1',
    deliveryDate: new Date().toISOString(),
    status: 'DRAFT',
    source: 'MANUAL',
    approvalType: null,
    approvedById: null,
    subtotal: '100',
    taxTotal: '10',
    total: '110',
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProduct(overrides: Partial<ProductDto> = {}): ProductDto {
  return {
    id: 'p1',
    name: 'Milk',
    sku: 'MILK-1L',
    category: 'MILK',
    uom: 'LITRE',
    active: true,
    ...overrides,
  } as ProductDto;
}

describe('deriveDashboard', () => {
  it('computes KPI values from orders', () => {
    const orders = [
      makeOrder({ status: 'SUBMITTED', total: '500' }),
      makeOrder({ status: 'APPROVED', total: '300' }),
      makeOrder({ status: 'DRAFT', total: '100' }),
    ];
    const products = [makeProduct({ active: true }), makeProduct({ active: false })];

    const result = deriveDashboard(orders, products);
    expect(result.totalOrders).toBe(3);
    expect(result.totalOrderValue).toBe(900);
    expect(result.awaitingReview).toBe(1);
    expect(result.approvedCount).toBe(1);
    expect(result.activeProducts).toBe(1);
  });

  it('handles empty arrays', () => {
    const result = deriveDashboard([], []);
    expect(result.totalOrders).toBe(0);
    expect(result.totalOrderValue).toBe(0);
    expect(result.awaitingReview).toBe(0);
    expect(result.activeProducts).toBe(0);
    expect(result.trend).toHaveLength(7);
  });
});
