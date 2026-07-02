'use client';

import * as React from 'react';
import { Plus, Wallet, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { PaymentLogDto } from '@moderns-milk/contracts';
import { usePayments, useUpdatePaymentStatus } from '@/features/payments/use-payments';
import { PaymentDialog } from '@/features/payments/payment-dialog';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const MODE_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank transfer',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PaymentsPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'ADMIN';

  const [status, setStatus] = React.useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [distributorId, setDistributorId] = React.useState('ALL');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);

  const { data: distributors } = useQuery({
    queryKey: ['admin', 'distributors'],
    queryFn: ({ signal }) => api.admin.distributors(signal),
  });

  const filters = React.useMemo(
    () => ({
      status: status === 'ALL' ? undefined : status,
      distributorId: distributorId !== 'ALL' ? distributorId : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [status, distributorId, dateFrom, dateTo],
  );
  const { data, isLoading, isError, error } = usePayments(filters);
  const statusMut = useUpdatePaymentStatus();
  const rows = data ?? [];

  async function markPaid(p: PaymentLogDto) {
    try {
      await statusMut.mutateAsync({ id: p.id, input: { status: 'PAID' } });
      toast({ title: 'Marked as paid', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not update', description: (err as Error)?.message, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment logs"
        description="Payments made by distributors, with proof and settlement status."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            Record payment
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={distributorId} onValueChange={setDistributorId}>
            <SelectTrigger className="w-[200px]" aria-label="Filter by distributor"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All distributors</SelectItem>
              {(distributors ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
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
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : isError ? (
            <EmptyState icon={Wallet} title="Couldn’t load payments" description={(error as Error)?.message ?? 'Please try again.'} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" description="Recorded distributor payments appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Txn ID</TableHead>
                  <TableHead>Distributor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p: PaymentLogDto) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{p.distributorName}</TableCell>
                    <TableCell>₹{p.amount}</TableCell>
                    <TableCell>{MODE_LABEL[p.mode] ?? p.mode}</TableCell>
                    <TableCell>{fmtDate(p.paymentDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.proofImageKey ? 'Uploaded' : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'PAID' ? 'success' : 'warning'}>
                        {p.status === 'PAID' ? 'Paid' : 'Pending'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {p.status === 'PENDING' ? (
                          <Button size="sm" variant="outline" onClick={() => markPaid(p)} disabled={statusMut.isPending}>
                            <Check className="size-4" /> Mark paid
                          </Button>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaymentDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
