'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  IndianRupee,
  Hourglass,
  CheckCircle2,
  Package,
  ArrowRight,
  Activity,
  AlertCircle,
  Wallet,
  Footprints,
  Target,
  Users,
} from 'lucide-react';
import { useOrders } from '@/features/orders/use-orders';
import { useProducts } from '@/features/catalog/use-products';
import { useDashboardStats } from '@/features/dashboard/use-dashboard';
import { deriveDashboard } from '@/features/dashboard/metrics';
import { ORDER_STATUS_META } from '@/lib/status';
import { formatMoney, formatMoneyCompact, formatNumber, formatRelative } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { humanizeEnum } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/ui/trend-chart';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { role } = useAuth();
  const ordersQ = useOrders();
  const productsQ = useProducts({ active: true });

  const statsQ = useDashboardStats();
  const stats = statsQ.data;
  const statsLoading = statsQ.isLoading;
  const loading = ordersQ.isLoading || productsQ.isLoading;
  const summary = React.useMemo(
    () => deriveDashboard(ordersQ.data ?? [], productsQ.data ?? []),
    [ordersQ.data, productsQ.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Operational overview${role ? ` · ${humanizeEnum(role)}` : ''}`}
      />

      {ordersQ.isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn’t load orders</AlertTitle>
          <AlertDescription>
            {(ordersQ.error as Error)?.message ?? 'Please retry.'}{' '}
            <button className="underline" onClick={() => ordersQ.refetch()}>
              Retry
            </button>
          </AlertDescription>
        </Alert>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total order value"
          value={formatMoneyCompact(summary.totalOrderValue)}
          icon={IndianRupee}
          hint={`${formatNumber(summary.totalOrders)} orders`}
          loading={loading}
        />
        <KpiCard
          label="Today’s orders"
          value={formatNumber(summary.todayOrders)}
          icon={ClipboardList}
          hint={formatMoney(summary.todayValue)}
          loading={loading}
        />
        <KpiCard
          label="Awaiting review"
          value={formatNumber(summary.awaitingReview)}
          icon={Hourglass}
          hint="Submitted orders"
          loading={loading}
        />
        <KpiCard
          label="Active products"
          value={formatNumber(summary.activeProducts)}
          icon={Package}
          hint="In catalog"
          loading={loading}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Outstanding dues"
          value={formatMoneyCompact(Number(stats?.dues.outstanding ?? 0))}
          icon={Wallet}
          hint={`${formatNumber(stats?.dues.outletsWithDues ?? 0)} outlets owe`}
          loading={statsLoading}
        />
        <KpiCard
          label="Sales visits · 30d"
          value={formatNumber(stats?.visits.count ?? 0)}
          icon={Footprints}
          hint={`${formatNumber(stats?.visits.newOutlets ?? 0)} new outlets`}
          loading={statsLoading}
        />
        <KpiCard
          label="Strike rate"
          value={`${stats?.visits.strikeRatePct ?? 0}%`}
          icon={Target}
          hint="Visits that booked an order"
          loading={statsLoading}
        />
        <KpiCard
          label="Network"
          value={formatNumber(stats?.network.outlets ?? 0)}
          icon={Users}
          hint={`${formatNumber(stats?.network.distributors ?? 0)} distributors · ${formatNumber(
            stats?.network.salesReps ?? 0,
          )} reps`}
          loading={statsLoading}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Top products by value</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)
          ) : (stats?.topSkus.length ?? 0) === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            stats?.topSkus.map((s, i) => (
              <div
                key={s.productId}
                className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 text-sm font-medium text-muted-foreground">{i + 1}</span>
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{formatNumber(s.qty)} units</span>
                </div>
                <span className="font-medium tabular-nums">{formatMoney(s.value)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Daily collection trend</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Order value by delivery date · last 7 days
              </p>
            </div>
            <CheckCircle2 className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <TrendChart data={summary.trend} formatValue={(v) => formatMoney(v)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
            ) : summary.statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              summary.statusBreakdown.map(({ status, count }) => {
                const pct = summary.totalOrders ? (count / summary.totalOrders) * 100 : 0;
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {ORDER_STATUS_META[status].label}
                      </span>
                      <span className="font-medium tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" /> Recent orders
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/orders">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : summary.recent.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No orders yet"
                description="Orders placed by retailers will appear here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {summary.recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/40 -mx-2 rounded-md px-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          Order #{o.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.items.length} item{o.items.length === 1 ? '' : 's'} ·{' '}
                          {formatRelative(o.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden text-sm font-medium tabular-nums sm:block">
                          {formatMoney(o.total)}
                        </span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
