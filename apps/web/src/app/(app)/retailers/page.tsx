'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle2, FileX2, MoreHorizontal, Pencil, Store } from 'lucide-react';
import { useRetailers, useUpdateRetailer } from '@/features/network/use-network';
import { RetailerFormDialog } from '@/features/network/retailer-form-dialog';
import { ApiError, type RetailerRow } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function RetailersPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useRetailers();
  const [search, setSearch] = React.useState('');
  const [distributor, setDistributor] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [editing, setEditing] = React.useState<RetailerRow | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [toggling, setToggling] = React.useState<RetailerRow | null>(null);

  const openEdit = (r: RetailerRow) => {
    setEditing(r);
    setFormOpen(true);
  };

  const distributors = React.useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.distributor).filter(Boolean))) as string[],
    [data],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    return (data ?? []).filter((r) => {
      if (distributor !== 'ALL' && r.distributor !== distributor) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (fromDate && new Date(r.createdAt) < fromDate) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setDate(end.getDate() + 1);
        if (new Date(r.createdAt) > end) return false;
      }
      if (!q) return true;
      return [r.outletName, r.phone ?? '', r.route ?? '', r.gstin ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, distributor, statusFilter, dateFrom, dateTo]);

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
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search by outlet, phone, route or GST…"
            containerClassName="sm:max-w-xs"
          />
          <Select value={distributor} onValueChange={setDistributor}>
            <SelectTrigger className="w-[180px]" aria-label="Filter by distributor"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All distributors</SelectItem>
              {distributors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
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
                  <TableHead className="text-right">Dues</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/retailers/${r.id}`)}
                  >
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
                    <TableCell className="text-right font-medium tabular-nums">
                      {Number(r.balance) > 0 ? (
                        <span className="text-destructive">{formatMoney(r.balance)}</span>
                      ) : (
                        <span className="text-muted-foreground">{formatMoney(r.balance)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'ACTIVE' ? 'success' : 'muted'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions
                        retailer={r}
                        onEdit={() => openEdit(r)}
                        onToggle={() => setToggling(r)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RetailerFormDialog
        open={formOpen}
        retailer={editing}
        onClose={() => setFormOpen(false)}
      />

      <ToggleStatusDialog retailer={toggling} onClose={() => setToggling(null)} />
    </div>
  );
}

function RowActions({
  retailer,
  onEdit,
  onToggle,
}: {
  retailer: RetailerRow;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const active = retailer.status === 'ACTIVE';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${retailer.outletName}`}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggle}>
          {active ? <Ban /> : <CheckCircle2 />}
          {active ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToggleStatusDialog({
  retailer,
  onClose,
}: {
  retailer: RetailerRow | null;
  onClose: () => void;
}) {
  const updateMut = useUpdateRetailer();
  const { toast } = useToast();
  const deactivating = retailer?.status === 'ACTIVE';

  async function confirm() {
    if (!retailer) return;
    try {
      await updateMut.mutateAsync({
        id: retailer.id,
        input: { status: deactivating ? 'SUSPENDED' : 'ACTIVE' },
      });
      toast({
        variant: 'success',
        title: deactivating ? 'Outlet deactivated' : 'Outlet activated',
        description: `${retailer.outletName} updated.`,
      });
      onClose();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={Boolean(retailer)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {deactivating ? 'Deactivate this outlet?' : 'Activate this outlet?'}
          </DialogTitle>
          <DialogDescription>
            {retailer?.outletName}.{' '}
            {deactivating
              ? 'It will be hidden from active operations but its orders and ledger are kept. You can reactivate it anytime.'
              : 'It will return to active operations.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMut.isPending}>
            Cancel
          </Button>
          <Button
            variant={deactivating ? 'destructive' : 'primary'}
            onClick={confirm}
            loading={updateMut.isPending}
          >
            {deactivating ? <Ban /> : <CheckCircle2 />}
            {deactivating ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
