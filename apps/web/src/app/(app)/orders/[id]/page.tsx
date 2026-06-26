'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, X, Receipt, Truck, CalendarDays, Boxes, FileX2 } from 'lucide-react';
import type { Role } from '@moderns-milk/contracts';
import { useOrder } from '@/features/orders/use-orders';
import { useProducts } from '@/features/catalog/use-products';
import { ReviewDialog } from '@/features/orders/review-dialog';
import { useAuth } from '@/lib/auth-context';
import { formatMoney, formatQty, formatDate, formatDateTime, humanizeEnum } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const REVIEW_ROLES: Role[] = ['DISTRIBUTOR', 'SALES_OFFICER', 'SALES_HEAD', 'ADMIN'];

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Receipt;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { role } = useAuth();
  const { data: order, isLoading, isError, error } = useOrder(id);
  const { data: products } = useProducts({});
  const [decision, setDecision] = React.useState<'APPROVE' | 'REJECT' | null>(null);

  const productName = React.useCallback(
    (productId: string) => {
      const p = products?.find((x) => x.id === productId);
      return p?.name ?? `#${productId.slice(-6).toUpperCase()}`;
    },
    [products],
  );

  const canReview =
    order?.status === 'SUBMITTED' && role !== null && REVIEW_ROLES.includes(role);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/orders">
            <ArrowLeft /> Back to orders
          </Link>
        </Button>
        <EmptyState
          icon={FileX2}
          title="Order not found"
          description={(error as Error)?.message ?? 'This order may not exist or is out of scope.'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/orders">
          <ArrowLeft /> Back to orders
        </Link>
      </Button>

      <PageHeader
        title={`Order #${order.id.slice(-6).toUpperCase()}`}
        description={`${order.retailer?.shopName ?? 'Customer'} · ${
          order.retailer?.user?.phone ?? '—'
        } · placed ${formatDateTime(order.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {canReview && (
              <>
                <Button variant="outline" size="sm" onClick={() => setDecision('REJECT')}>
                  <X /> Reject
                </Button>
                <Button size="sm" onClick={() => setDecision('APPROVE')}>
                  <Check /> Approve
                </Button>
              </>
            )}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat icon={CalendarDays} label="Delivery date" value={formatDate(order.deliveryDate)} />
        <SummaryStat icon={Truck} label="Source" value={humanizeEnum(order.source)} />
        <SummaryStat
          icon={Boxes}
          label="Approval"
          value={order.approvalType ? humanizeEnum(order.approvalType) : '—'}
        />
        <SummaryStat icon={Receipt} label="Total" value={formatMoney(order.total)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{productName(item.productId)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(item.qtyOrdered)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.qtyApproved ? formatQty(item.qtyApproved) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(Number(item.unitPrice) * Number(item.qtyOrdered))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile line items */}
            <ul className="divide-y divide-border sm:hidden">
              {order.items.map((item) => (
                <li key={item.id} className="space-y-1 p-4">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{productName(item.productId)}</span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(Number(item.unitPrice) * Number(item.qtyOrdered))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatQty(item.qtyOrdered)} × {formatMoney(item.unitPrice)}
                    {item.qtyApproved ? ` · approved ${formatQty(item.qtyApproved)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums">{formatMoney(order.taxTotal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(order.total)}</span>
            </div>
            <div className="pt-2">
              <Badge variant="muted" className="font-mono">
                {order.items.length} line item{order.items.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <ReviewDialog order={order} decision={decision} onClose={() => setDecision(null)} />
    </div>
  );
}
