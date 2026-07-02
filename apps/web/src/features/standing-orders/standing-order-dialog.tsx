'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { upsertStandingOrderSchema } from '@moderns-milk/contracts';
import { ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/features/catalog/use-products';
import { useOnboardedUsers } from '@/features/onboarding/use-onboarding';
import { useCreateStandingOrder, useUpdateStandingOrder } from './use-standing-orders';
import type { StandingOrderDto } from '@moderns-milk/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onClose: () => void;
  edit?: StandingOrderDto | null;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Line {
  productId: string;
  qty: string;
}

export function StandingOrderDialog({ open, onClose, edit }: Props) {
  const { toast } = useToast();
  const createMut = useCreateStandingOrder();
  const updateMut = useUpdateStandingOrder();
  const products = useProducts({ active: true });
  const retailers = useOnboardedUsers('retailers', '');

  const [retailerId, setRetailerId] = React.useState('');
  const [name, setName] = React.useState('');
  const [active, setActive] = React.useState(true);
  const [weekdayMask, setWeekdayMask] = React.useState(127);
  const [lines, setLines] = React.useState<Line[]>([{ productId: '', qty: '' }]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setRetailerId(edit?.retailerId ?? '');
      setName(edit?.name ?? '');
      setActive(edit?.active ?? true);
      setWeekdayMask(edit?.weekdayMask ?? 127);
      setLines(
        edit?.items.map((i) => ({ productId: i.productId, qty: String(i.qty) })) ?? [
          { productId: '', qty: '' },
        ],
      );
      setErrors({});
    }
  }, [open, edit]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { productId: '', qty: '' }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const toggleDay = (day: number) => {
    setWeekdayMask((prev) => prev ^ (1 << day));
  };

  async function submit() {
    setErrors({});
    try {
      const input = upsertStandingOrderSchema.parse({
        retailerId,
        name: name.trim() || undefined,
        weekdayMask,
        active,
        items: lines
          .filter((l) => l.productId && l.qty)
          .map((l) => ({ productId: l.productId, qty: l.qty })),
      });
      if (edit) {
        await updateMut.mutateAsync({ id: edit.id, input });
        toast({ title: 'Standing order updated', variant: 'success' });
      } else {
        await createMut.mutateAsync(input);
        toast({ title: 'Standing order created', variant: 'success' });
      }
      onClose();
    } catch (err) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const out: Record<string, string> = {};
        for (const issue of (err as { issues: { path: (string | number)[]; message: string }[] }).issues) {
          out[String(issue.path[0] ?? '_')] = issue.message;
        }
        setErrors(out);
        return;
      }
      const msg = err instanceof ApiError ? err.message : 'Something went wrong';
      toast({ title: 'Could not save', description: msg, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{edit ? 'Edit' : 'Create'} standing order</DialogTitle>
          <DialogDescription>
            Set up recurring orders for automatic generation on selected days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Retailer <span className="text-destructive">*</span></Label>
            <Select value={retailerId} onValueChange={setRetailerId} disabled={!!edit}>
              <SelectTrigger><SelectValue placeholder="Select retailer" /></SelectTrigger>
              <SelectContent>
                {(retailers.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {String(r.extra?.outlet ?? r.fullName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.retailerId ? <p className="text-xs text-destructive">{errors.retailerId}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Daily milk" />
          </div>

          <div className="space-y-1.5">
            <Label>Active days</Label>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((day, i) => {
                const selected = Boolean(weekdayMask & (1 << i));
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                active ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  active ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <Label htmlFor="active">Active</Label>
          </div>

          <div className="space-y-2">
            <Label>Products</Label>
            {lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={line.productId} onValueChange={(v) => setLine(i, { productId: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Product" /></SelectTrigger>
                  <SelectContent>
                    {(products.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-24"
                  inputMode="decimal"
                  placeholder="Qty"
                  value={line.qty}
                  onChange={(e) => setLine(i, { qty: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)}
                  disabled={lines.length === 1} aria-label="Remove line">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {errors.items ? <p className="text-xs text-destructive">{errors.items}</p> : null}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="size-4" /> Add product
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending || updateMut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
            {createMut.isPending || updateMut.isPending ? 'Saving...' : edit ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
