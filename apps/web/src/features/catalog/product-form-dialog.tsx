'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import {
  upsertProductSchema,
  type ProductDto,
  type UpsertProductInput,
} from '@moderns-milk/contracts';
import { ApiError } from '@/lib/api';
import { useCreateProduct, useUpdateProduct } from './use-products';
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

interface ProductFormDialogProps {
  open: boolean;
  /** Pass a product to edit; omit to create. */
  product?: ProductDto | null;
  onClose: () => void;
}

interface FormState {
  name: string;
  sku: string;
  category: 'MILK' | 'DAIRY';
  uom: ProductDto['uom'];
  packSize: string;
  taxRate: string;
  hsnCode: string;
  shelfLifeDays: string;
  isReturnablePack: boolean;
  active: boolean;
}

function initialState(product?: ProductDto | null): FormState {
  return {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? 'MILK',
    uom: product?.uom ?? 'LITRE',
    packSize: product?.packSize ?? '',
    taxRate: product?.taxRate ?? '0',
    hsnCode: product?.hsnCode ?? '',
    shelfLifeDays: product?.shelfLifeDays != null ? String(product.shelfLifeDays) : '',
    isReturnablePack: product?.isReturnablePack ?? false,
    active: product?.active ?? true,
  };
}

const UOMS: ProductDto['uom'][] = ['LITRE', 'ML', 'KG', 'GRAM', 'PIECE', 'POUCH'];

export function ProductFormDialog({ open, product, onClose }: ProductFormDialogProps) {
  const isEdit = Boolean(product);
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const { toast } = useToast();

  const [form, setForm] = React.useState<FormState>(() => initialState(product));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset the form whenever the dialog opens for a (different) product.
  React.useEffect(() => {
    if (open) {
      setForm(initialState(product));
      setErrors({});
    }
  }, [open, product]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const pending = createMut.isPending || updateMut.isPending;

  async function submit() {
    const raw = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      uom: form.uom,
      packSize: form.packSize,
      taxRate: form.taxRate,
      hsnCode: form.hsnCode.trim() || undefined,
      shelfLifeDays: form.shelfLifeDays.trim() ? Number(form.shelfLifeDays) : undefined,
      isReturnablePack: form.isReturnablePack,
      active: form.active,
    };

    const parsed = upsertProductSchema.safeParse(raw);
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
      const input: UpsertProductInput = parsed.data;
      if (isEdit && product) {
        await updateMut.mutateAsync({ id: product.id, input });
      } else {
        await createMut.mutateAsync(input);
      }
      toast({
        variant: 'success',
        title: isEdit ? 'Product updated' : 'Product created',
        description: `${input.name} (${input.sku}) saved.`,
      });
      onClose();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: isEdit ? 'Update failed' : 'Create failed',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'Add product'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this SKU in the master catalog.'
              : 'Add a new milk or dairy SKU to the master catalog.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Gold Milk"
            />
          </Field>

          <Field label="SKU" error={errors.sku}>
            <Input
              value={form.sku}
              onChange={(e) => set('sku', e.target.value.toUpperCase())}
              placeholder="GOLD-1L"
              className="font-mono"
            />
          </Field>

          <Field label="Category" error={errors.category}>
            <Select value={form.category} onValueChange={(v) => set('category', v as FormState['category'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MILK">Milk</SelectItem>
                <SelectItem value="DAIRY">Dairy</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Unit of measure" error={errors.uom}>
            <Select value={form.uom} onValueChange={(v) => set('uom', v as FormState['uom'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UOMS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u.charAt(0) + u.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Pack size" error={errors.packSize}>
            <Input
              value={form.packSize}
              onChange={(e) => set('packSize', e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="1.000"
            />
          </Field>

          <Field label="Tax rate (%)" error={errors.taxRate}>
            <Input
              value={form.taxRate}
              onChange={(e) => set('taxRate', e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="0"
            />
          </Field>

          <Field label="HSN code (optional)" error={errors.hsnCode}>
            <Input
              value={form.hsnCode}
              onChange={(e) => set('hsnCode', e.target.value)}
              placeholder="0401"
            />
          </Field>

          <Field label="Shelf life (days, optional)" error={errors.shelfLifeDays}>
            <Input
              value={form.shelfLifeDays}
              onChange={(e) => set('shelfLifeDays', e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="e.g. 2"
            />
          </Field>

          <div className="flex flex-col gap-3 sm:col-span-2">
            <CheckboxRow
              label="Returnable pack (bucket / matka)"
              checked={form.isReturnablePack}
              onChange={(v) => set('isReturnablePack', v)}
            />
            <CheckboxRow
              label="Active (available for ordering)"
              checked={form.active}
              onChange={(v) => set('active', v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={pending}>
            <Check />
            {isEdit ? 'Save changes' : 'Create product'}
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

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}
