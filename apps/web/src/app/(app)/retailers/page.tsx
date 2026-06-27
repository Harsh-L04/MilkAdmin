'use client';

import * as React from 'react';
import { Store, FileX2 } from 'lucide-react';
import { useRetailers } from '@/features/network/use-network';
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

export default function RetailersPage() {
  const { data, isLoading, isError, error, refetch } = useRetailers();
  const [search, setSearch] = React.useState('');
  const [distributor, setDistributor] = React.useState<string>('ALL');

  const distributors = React.useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.distributor).filter(Boolean))) as string[],
    [data],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (distributor !== 'ALL' && r.distributor !== distributor) return false;
      if (!q) return true;
      return [r.outletName, r.phone ?? '', r.route ?? '', r.gstin ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, distributor]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retailers"
        description="The company-wide outlet registry — every retailer, independent of any distributor."
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
            placeholder="Search by outlet, phone, route or GST…"
            containerClassName="sm:max-w-xs"
          />
          <div className="sm:ml-auto">
            <Select value={distributor} onValueChange={setDistributor}>
              <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filter by distributor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All distributors</SelectItem>
                {distributors.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
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
              title="Couldn’t load retailers"
              description={(error as Error)?.message ?? 'Please try again.'}
              action={
                <button className="text-sm font-medium text-primary underline" onClick={() => refetch()}>
                  Retry
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No retailers found"
              description={
                search || distributor !== 'ALL'
                  ? 'Try clearing filters to see more.'
                  : 'Outlets appear here as distributors register them.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Outlet</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Distributor</TableHead>
                  <TableHead>Sales rep</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.outletName}</p>
                      {r.address ? (
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {r.address}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{r.phone ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.route ?? '—'}</TableCell>
                    <TableCell className="text-sm">{r.distributor ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.salesOfficer ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'ACTIVE' ? 'success' : 'muted'}>
                        {r.status}
                      </Badge>
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
