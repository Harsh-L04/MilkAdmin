'use client';

import * as React from 'react';
import { Route as RouteIcon, FileX2 } from 'lucide-react';
import { useSalesVisits } from '@/features/sales-visits/use-sales-visits';
import { formatMoney, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function SalesVisitsPage() {
  const [search, setSearch] = React.useState('');
  const [outletType, setOutletType] = React.useState('ALL');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const apiFilters = React.useMemo(
    () => ({
      outletType: outletType !== 'ALL' ? outletType : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [outletType, dateFrom, dateTo],
  );

  const { data, isLoading, isError, error, refetch } = useSalesVisits(apiFilters);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (v) =>
        !q ||
        [v.retailer, v.salesOfficer, v.route ?? '', v.competition ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales visits"
        description="Field beat reports — every outlet visit, the order booked, and what the competition is doing."
        actions={
          data ? (
            <Badge variant="muted" className="h-8 px-3">
              {data.length} total
            </Badge>
          ) : null
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search by outlet, rep, route…"
            containerClassName="sm:max-w-xs"
          />
          <Select value={outletType} onValueChange={setOutletType}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by outlet type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All outlets</SelectItem>
              <SelectItem value="EXISTING">Existing</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="To date"
          />
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
              title="Couldn’t load visits"
              description={(error as Error)?.message ?? 'Please try again.'}
              action={
                <button className="text-sm font-medium text-primary underline" onClick={() => refetch()}>
                  Retry
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={RouteIcon}
              title="No sales visits yet"
              description="Visits logged by your sales team will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Sales rep</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Timings</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm">{formatDate(v.date)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{v.retailer}</p>
                      {v.outletType === 'NEW' ? (
                        <Badge variant="muted" className="mt-0.5">
                          New outlet
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{v.salesOfficer}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.route ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {v.inTime ? `In ${v.inTime}` : '—'}
                      {v.bookingTime ? ` · Booked ${v.bookingTime}` : ''}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{v.itemCount}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {v.orderTotal ? formatMoney(v.orderTotal) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
