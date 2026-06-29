'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { updateCustomerSchema, type UpdateCustomerInput } from '@moderns-milk/contracts';
import { ApiError, type RetailerRow } from '@/lib/api';
import { useUpdateRetailer } from './use-network';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RetailerFormDialogProps {
  open: boolean;
  retailer: RetailerRow | null;
  onClose: () => void;
}

interface FormState {
  outletName: string;
  address: string;
  route: string;
  gstin: string;
  whatsapp: string;
  paymentTerms: string;
  outletType: 'NEW' | 'EXISTING';
}

function initialState(r: RetailerRow | null): FormState {
  return {
    outletName: r?.outletName ?? '',
    address: r?.address ?? '',
    route: r?.route ?? '',
    gstin: r?.gstin ?? '',
    whatsapp: r?.whatsapp ?? '',
    paymentTerms: r?.paymentTerms ?? '',
    outletType: r?.outletType ?? 'EXISTING',
  };
}

export function RetailerFormDialog({ open, retailer, onClose }: RetailerFormDialogProps) {
  const updateMut = useUpdateRetailer();
  const { toast } = useToast();
  const [form, setForm] = React.useState<FormState>(() => initialState(retailer));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setForm(initialState(retailer));
      setErrors({});
    }
  }, [open, retailer]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    if (!retailer) return;
    // Optional fields are omitted when blank — the strict GSTIN/phone schemas
    // reject empty strings, and clearing a value is a separate concern.
    const raw: Record<string, unknown> = {
      outletName: form.outletName,
      address: form.address,
      route: form.route,
      outletType: form.outletType,
    };
    if (form.gstin.trim()) raw.gstin = form.gstin.trim();
    if (form.whatsapp.trim()) raw.whatsapp = form.whatsapp.trim();
    if (form.paymentTerms.trim()) raw.paymentTerms = form.paymentTerms.trim();

    const parsed = updateCustomerSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    try {
      await updateMut.mutateAsync({ id: retailer.id, input: parsed.data as UpdateCustomerInput });
      toast({
        variant: 'success',
        title: 'Outlet updated',
        description: `${form.outletName} saved.`,
      });
      onClose();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit outlet</DialogTitle>
          <DialogDescription>
            Update {retailer?.outletName}. The contact number is the login key and
            can&apos;t be changed here.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Outlet name" error={errors.outletName} className="sm:col-span-2">
            <Input value={form.outletName} onChange={(e) => set('outletName', e.target.value)} />
          </Field>
          <Field label="Address" error={errors.address} className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="Route" error={errors.route}>
            <Input value={form.route} onChange={(e) => set('route', e.target.value)} />
          </Field>
          <Field label="Outlet type" error={errors.outletType}>
            <Select value={form.outletType} onValueChange={(v) => set('outletType', v as FormState['outletType'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXISTING">Existing</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="GSTIN (optional)" error={errors.gstin}>
            <Input
              value={form.gstin}
              onChange={(e) => set('gstin', e.target.value.toUpperCase())}
              className="font-mono"
              placeholder="15-char GSTIN"
            />
          </Field>
          <Field label="WhatsApp (optional)" error={errors.whatsapp}>
            <Input
              value={form.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              placeholder="+91…"
            />
          </Field>
          <Field label="Payment terms (optional)" error={errors.paymentTerms} className="sm:col-span-2">
            <Input
              value={form.paymentTerms}
              onChange={(e) => set('paymentTerms', e.target.value)}
              placeholder="e.g. 7 days credit"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMut.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={updateMut.isPending}>
            <Check />
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
