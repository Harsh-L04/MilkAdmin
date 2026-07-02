'use client';

import * as React from 'react';
import { createPaymentSchema, type PaymentLogMode } from '@moderns-milk/contracts';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useOnboardedUsers } from '@/features/onboarding/use-onboarding';
import { useCreatePayment } from './use-payments';
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

const MODES: { value: PaymentLogMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentDialog({ open, onClose }: Props) {
  const { toast } = useToast();
  const createMut = useCreatePayment();
  const distributors = useOnboardedUsers('distributors', '');

  const [distributorId, setDistributorId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState(today());
  const [mode, setMode] = React.useState<PaymentLogMode>('UPI');
  const [proofImageKey, setProofImageKey] = React.useState('');
  const [proofPreview, setProofPreview] = React.useState('');
  const [uploadingProof, setUploadingProof] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setDistributorId('');
      setAmount('');
      setPaymentDate(today());
      setMode('UPI');
      setProofImageKey('');
      setProofPreview('');
      setUploadingProof(false);
      setNote('');
      setErrors({});
    }
  }, [open]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    try {
      const result = await api.files.upload(file);
      setProofImageKey(result.key);
      setProofPreview(result.url);
      toast({ title: 'Proof uploaded', variant: 'success' });
    } catch (err) {
      toast({ title: 'Upload failed', description: (err as Error)?.message, variant: 'destructive' });
    } finally {
      setUploadingProof(false);
    }
  }

  async function submit() {
    setErrors({});
    try {
      const input = createPaymentSchema.parse({
        distributorId: distributorId || undefined,
        amount,
        paymentDate,
        mode,
        proofImageKey: proofImageKey || undefined,
        note: note || undefined,
      });
      if (!distributorId) {
        setErrors({ distributorId: 'Select a distributor' });
        return;
      }
      await createMut.mutateAsync(input);
      toast({ title: 'Payment recorded', variant: 'success' });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>Log a payment made by a distributor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Distributor<span className="text-destructive"> *</span></Label>
            <Select value={distributorId} onValueChange={setDistributorId}>
              <SelectTrigger><SelectValue placeholder="Select distributor" /></SelectTrigger>
              <SelectContent>
                {(distributors.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.distributorId ? <p className="text-xs text-destructive">{errors.distributorId}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount<span className="text-destructive"> *</span></Label>
              <Input id="amount" inputMode="decimal" value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
              {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentDate">Payment date</Label>
              <Input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as PaymentLogMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proof">Proof of transaction</Label>
            <div className="flex items-center gap-2">
              <Input
                id="proof"
                type="file"
                accept="image/*"
                className="file:text-foreground"
                onChange={handleFileUpload}
                disabled={uploadingProof}
              />
              {uploadingProof && <span className="text-sm text-muted-foreground shrink-0">Uploading…</span>}
            </div>
            {proofImageKey && (
              <div className="mt-2">
                {proofPreview ? (
                  <a href={proofPreview} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofPreview}
                      alt="Proof preview"
                      className="h-24 w-24 rounded-md border object-cover"
                    />
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">File uploaded (key: {proofImageKey.slice(0, 8)}…)</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Saving…' : 'Record payment'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
