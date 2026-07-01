'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, FileX2, ChevronRight } from 'lucide-react';
import type { OrderStatus } from '@moderns-milk/contracts';
import { useOrders } from '@/features/orders/use-orders';
import { ALL_ORDER_STATUSES, ORDER_STATUS_META } from '@/lib/status';
import { formatMoney, formatDate, formatRelative, humanizeEnum } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type StatusFilter = OrderStatus | 'ALL';

export default function OrdersPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useOrders();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<StatusFilter>('ALL');

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (status !== 'ALL' && o.status !== status) return false;
      if (q) {
        const hay = [o.id, o.retailer?.shopName ?? '', o.retailer?.user?.phone ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="All orders across your scope, newest first."
        actions={
          data ? (
            <Badge variant="muted" className="h-8 px-3">
              {data.length} total
            </Badge>
          ) : null
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search by order ID, shop or mobile…"
            containerClassName="sm:max-w-xs"
          />
          <div className="sm:ml-auto">
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {ALL_ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={FileX2}
              title="Couldn’t load orders"
              description={(error as Error)?.message ?? 'Please try again.'}
              action={
                <button className="text-sm font-medium text-primary underline" onClick={() => refetch()}>
                  Retry
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No orders found"
              description={
                search || status !== 'ALL'
                  ? 'Try clearing filters to see more.'
                  : 'Orders will appear here once retailers start placing them.'
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/orders/${o.id}`)}
                      >
                        <TableCell>
                          <p className="font-medium">#{o.id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelative(o.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="flex items-center gap-1.5 font-medium">
                            {o.orderType === 'SELF' ? '(Self-Order)' : (o.retailer?.shopName ?? '—')}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {o.retailer?.user?.phone ?? '—'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {humanizeEnum(o.source)}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(o.deliveryDate)}</TableCell>
                        <TableCell className="text-right tabular-nums">{o.items.length}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(o.total)}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-border md:hidden">
                {filtered.map((o) => (
                  <li key={o.id}>
                    <button
                      className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40"
                      onClick={() => router.push(`/orders/${o.id}`)}
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{o.id.slice(-6).toUpperCase()}</span>
                          <OrderStatusBadge status={o.status} />
                        </div>
                        <p className="truncate text-sm font-medium">
                          {o.retailer?.shopName ?? '—'}
                          <span className="ml-1 font-normal text-muted-foreground tabular-nums">
                            {o.retailer?.user?.phone ?? ''}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.items.length} item{o.items.length === 1 ? '' : 's'} ·{' '}
                          {formatDate(o.deliveryDate)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium tabular-nums">{formatMoney(o.total)}</p>
                        <p className="text-xs text-muted-foreground">{humanizeEnum(o.source)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
