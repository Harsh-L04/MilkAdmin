'use client';

import * as React from 'react';
import { Building2, FileX2, Pencil } from 'lucide-react';
import { useDistributors } from '@/features/network/use-network';
import { DistributorEditDialog } from '@/features/network/distributor-edit-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
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
import type { DistributorRow } from '@/lib/api';

export default function DistributorsPage() {
  const { data, isLoading, isError, error, refetch } = useDistributors();
  const [search, setSearch] = React.useState('');
  const [regionFilter, setRegionFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [editDistributor, setEditDistributor] = React.useState<DistributorRow | null>(null);

  const regions = React.useMemo(() => {
    const s = new Set((data ?? []).map((d) => d.region).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [data]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((d) => {
      if (regionFilter !== 'ALL' && d.region !== regionFilter) return false;
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (q && ![d.name, d.code, d.region ?? ''].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, regionFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributors"
        description="Every distributor in your network, with their outlet and route reach."
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
            placeholder="Search by name, code or region…"
            containerClassName="sm:max-w-xs"
          />
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by region"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All regions</SelectItem>
              {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={FileX2}
              title="Couldn’t load distributors"
              description={(error as Error)?.message ?? 'Please try again.'}
              action={
                <button className="text-sm font-medium text-primary underline" onClick={() => refetch()}>
                  Retry
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No distributors found"
              description="They will appear here as your network grows."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Distributor</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Outlets</TableHead>
                  <TableHead className="text-right">Routes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.code}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.region ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {d.outlets}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{d.routes}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'ACTIVE' ? 'success' : 'muted'}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setEditDistributor(d)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <DistributorEditDialog distributor={editDistributor} onClose={() => setEditDistributor(null)} />
    </div>
  );
}
