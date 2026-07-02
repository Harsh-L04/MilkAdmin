'use client';

import * as React from 'react';
import { Repeat, FileX2, Pencil, Trash2 } from 'lucide-react';
import type { StandingOrderDto } from '@moderns-milk/contracts';
import { useStandingOrders, useDeleteStandingOrder } from '@/features/standing-orders/use-standing-orders';
import { StandingOrderDialog } from '@/features/standing-orders/standing-order-dialog';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekdayLabel(mask: number): string {
  const days = WEEKDAYS.filter((_, i) => mask & (1 << i));
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !(mask & (1 << 5)) && !(mask & (1 << 6))) return 'Weekdays';
  if (days.length === 2 && (mask & (1 << 5)) && (mask & (1 << 6))) return 'Weekends';
  return days.join(', ') || 'None';
}

export default function StandingOrdersPage() {
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = useStandingOrders();
  const deleteMut = useDeleteStandingOrder();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StandingOrderDto | null>(null);

  const rows = data ?? [];

  async function handleDelete(id: string, name: string | null) {
    if (!confirm(`Delete standing order "${name ?? 'Untitled'}"?`)) return;
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: 'Standing order deleted', variant: 'success' });
    } catch {
      toast({ title: 'Could not delete', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Standing orders"
        description="Recurring orders that auto-generate on scheduled days."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Repeat />
            Create standing order
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={FileX2}
              title="Couldn't load standing orders"
              description={(error as Error)?.message ?? 'Please try again.'}
              action={
                <button className="text-sm font-medium text-primary underline" onClick={() => refetch()}>
                  Retry
                </button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No standing orders yet"
              description="Create recurring orders for your retailers."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((so) => (
                      <TableRow key={so.id}>
                        <TableCell className="font-medium">{so.name ?? 'Untitled'}</TableCell>
                        <TableCell>{so.retailer}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {weekdayLabel(so.weekdayMask)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={so.active ? 'success' : 'muted'}>
                            {so.active ? 'Active' : 'Paused'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {so.items.map((i) => `${i.product?.name ?? i.productId} \u00d7${i.qty}`).join(', ')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditing(so); setFormOpen(true); }}
                              aria-label="Edit"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(so.id, so.name)}
                              aria-label="Delete"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y divide-border md:hidden">
                {rows.map((so) => (
                  <li key={so.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{so.name ?? 'Untitled'}</span>
                          <Badge variant={so.active ? 'success' : 'muted'}>
                            {so.active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{so.retailer}</p>
                        <p className="text-xs text-muted-foreground">{weekdayLabel(so.weekdayMask)}</p>
                        <p className="text-xs text-muted-foreground">
                          {so.items.length} product{so.items.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(so); setFormOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(so.id, so.name)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <StandingOrderDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} edit={editing} />
    </div>
  );
}
