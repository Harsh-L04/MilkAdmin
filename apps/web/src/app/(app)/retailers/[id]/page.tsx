'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Wallet, CreditCard } from 'lucide-react';
import type { PaymentMode } from '@moderns-milk/contracts';
import { useOutletLedger, useRecordCollection } from '@/features/ledger/use-ledger';
import { formatMoney, formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const MODES: PaymentMode[] = ['CASH', 'UPI', 'CHEQUE', 'OTHER'];

export default function OutletLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useOutletLedger(id);
  const collect = useRecordCollection();

  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  const [mode, setMode] = React.useState<PaymentMode>('CASH');
  const [note, setNote] = React.useState('');

  const submit = () => {
    if (!(Number(amount) > 0)) return;
    collect.mutate(
      { retailerId: id, amount, mode, note: note || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setAmount('');
          setNote('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/retailers">
          <ArrowLeft /> Back to retailers
        </Link>
      </Button>

      <PageHeader
        title={isLoading ? 'Outlet ledger' : (data?.outletName ?? 'Outlet ledger')}
        description="Dues, credit limit and the full payment / order ledger."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <CreditCard /> Record payment
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Wallet className="size-[18px]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding dues</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-5 w-20" />
              ) : (
                <p className="text-lg font-semibold">{formatMoney(data?.balance ?? '0')}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <CreditCard className="size-[18px]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Credit limit</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-5 w-20" />
              ) : (
                <p className="text-lg font-semibold">{formatMoney(data?.creditLimit ?? '0')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.entries ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(e.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.type === 'CREDIT' ? 'success' : 'muted'}>
                      {e.type === 'CREDIT' ? 'Payment' : 'Order'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.note ?? e.refType}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.type === 'CREDIT' ? '−' : '+'}
                    {formatMoney(e.amount)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(e.balanceAfter)}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.entries.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No ledger activity yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount</Label>
              <Input
                id="amt"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as PaymentMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                placeholder="e.g. part payment"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={collect.isPending || !(Number(amount) > 0)}>
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
