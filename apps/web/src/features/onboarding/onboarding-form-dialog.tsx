'use client';

import * as React from 'react';
import {
  onboardDistributorSchema,
  onboardRetailerSchema,
  onboardStaffSchema,
} from '@moderns-milk/contracts';
import { ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  useOnboardDistributor,
  useOnboardRetailer,
  useOnboardStaff,
  useOnboardedUsers,
  type UserTab,
} from './use-onboarding';
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

const ONBOARDING_STATUSES = ['PENDING', 'PROSPECTIVE', 'ONBOARDED', 'REJECTED'] as const;

const TITLES: Record<UserTab, string> = {
  distributors: 'Onboard distributor',
  retailers: 'Onboard retailer',
  'sales-heads': 'Onboard sales head',
  'sales-officers': 'Onboard sales officer',
};

interface Props {
  open: boolean;
  tab: UserTab;
  onClose: () => void;
}

/** 10 local digits -> E.164 (+91…). Empty stays empty. */
function toE164(local: string): string {
  const digits = local.replace(/\D/g, '').slice(0, 10);
  return digits ? `+91${digits}` : '';
}

type FieldErrors = Record<string, string>;

function zodErrors(err: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (err && typeof err === 'object' && 'issues' in err) {
    for (const issue of (err as { issues: { path: (string | number)[]; message: string }[] }).issues) {
      out[String(issue.path[0] ?? '_')] = issue.message;
    }
  }
  return out;
}

export function OnboardingFormDialog({ open, tab, onClose }: Props) {
  const { toast } = useToast();
  const distMut = useOnboardDistributor();
  const retMut = useOnboardRetailer();
  const staffMut = useOnboardStaff();

  // Reference data for dropdowns.
  const distributors = useOnboardedUsers('distributors', '');
  const salesHeads = useOnboardedUsers('sales-heads', '');

  const [form, setForm] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<FieldErrors>({});

  React.useEffect(() => {
    if (open) {
      setForm({ onboardingStatus: 'PENDING', status: 'ACTIVE', role: tab === 'sales-heads' ? 'SALES_HEAD' : 'SALES_OFFICER' });
      setErrors({});
    }
  }, [open, tab]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const pending = distMut.isPending || retMut.isPending || staffMut.isPending;

  async function submit() {
    setErrors({});
    try {
      if (tab === 'distributors') {
        const input = onboardDistributorSchema.parse({
          fullName: form.fullName,
          email: form.email || undefined,
          phone: toE164(form.phone ?? ''),
          region: form.region || undefined,
          subArea: form.subArea || undefined,
          address: form.address || undefined,
          pan: form.pan || undefined,
          bankDetails: form.bankDetails || undefined,
          securityDeposit: form.securityDeposit || undefined,
          onboardingStatus: form.onboardingStatus,
          onboardingNote: form.onboardingNote || undefined,
          status: form.status,
        });
        await distMut.mutateAsync(input);
      } else if (tab === 'retailers') {
        const input = onboardRetailerSchema.parse({
          fullName: form.fullName,
          email: form.email || undefined,
          phone: toE164(form.phone ?? ''),
          area: form.area || undefined,
          subArea: form.subArea || undefined,
          address: form.address || undefined,
          distributorId: form.distributorId,
          salesOfficerId: form.salesOfficerId || undefined,
          outletName: form.outletName,
          shopEstablishedOn: form.shopEstablishedOn || undefined,
          brandsDealing: form.brandsDealing
            ? form.brandsDealing.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          monthlyTurnover: form.monthlyTurnover || undefined,
          pan: form.pan || undefined,
          shopLicenseNo: form.shopLicenseNo || undefined,
          securityDeposit: form.securityDeposit || undefined,
          instrumentNo: form.instrumentNo || undefined,
          onboardingStatus: form.onboardingStatus,
          onboardingNote: form.onboardingNote || undefined,
          status: form.status,
        });
        await retMut.mutateAsync(input);
      } else {
        const input = onboardStaffSchema.parse({
          fullName: form.fullName,
          email: form.email || undefined,
          phone: toE164(form.phone ?? ''),
          role: tab === 'sales-heads' ? 'SALES_HEAD' : 'SALES_OFFICER',
          reportsToId: form.reportsToId || undefined,
          area: form.area || undefined,
          subArea: form.subArea || undefined,
          status: form.status,
        });
        await staffMut.mutateAsync(input);
      }
      toast({ title: 'User onboarded', variant: 'success' });
      onClose();
    } catch (err) {
      if (err && typeof err === 'object' && 'issues' in err) {
        setErrors(zodErrors(err));
        return;
      }
      const msg = err instanceof ApiError ? err.message : 'Something went wrong';
      toast({ title: 'Could not onboard', description: msg, variant: 'destructive' });
    }
  }

  const field = (
    key: string,
    label: string,
    opts: { type?: string; placeholder?: string; required?: boolean } = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>
        {label}
        {opts.required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={key}
        type={opts.type ?? 'text'}
        value={form[key] ?? ''}
        placeholder={opts.placeholder}
        onChange={(e) => set(key, e.target.value)}
      />
      {errors[key] ? <p className="text-xs text-destructive">{errors[key]}</p> : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{TITLES[tab]}</DialogTitle>
          <DialogDescription>
            Capture the details collected during onboarding. No verification in this phase.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {field('fullName', 'Full name', { required: true })}
          <div className="space-y-1.5">
            <Label htmlFor="phone">
              Phone<span className="text-destructive"> *</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">+91</span>
              <Input
                id="phone"
                inputMode="numeric"
                value={form.phone ?? ''}
                placeholder="10-digit number"
                onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
          </div>
          {field('email', 'Email', { type: 'email' })}

          {tab === 'distributors' && (
            <>
              {field('region', 'Region / Area')}
              {field('subArea', 'Sub-area')}
              {field('address', 'Address')}
              {field('pan', 'PAN number')}
              {field('bankDetails', 'Bank details')}
              {field('securityDeposit', 'Security deposit', { type: 'text', placeholder: '0.00' })}
            </>
          )}

          {tab === 'retailers' && (
            <>
              {field('outletName', 'Outlet name', { required: true })}
              <div className="space-y-1.5">
                <Label>Distributor<span className="text-destructive"> *</span></Label>
                <Select value={form.distributorId ?? ''} onValueChange={(v) => set('distributorId', v)}>
                  <SelectTrigger><SelectValue placeholder="Assign distributor" /></SelectTrigger>
                  <SelectContent>
                    {(distributors.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.distributorId ? <p className="text-xs text-destructive">{errors.distributorId}</p> : null}
              </div>
              {field('area', 'Area')}
              {field('subArea', 'Sub-area')}
              {field('address', 'Address')}
              {field('shopEstablishedOn', 'Shop established (YYYY-MM)', { placeholder: '2019-06' })}
              {field('brandsDealing', 'Brands dealing (comma-separated)')}
              {field('monthlyTurnover', 'Monthly turnover')}
              {field('pan', 'PAN number')}
              {field('shopLicenseNo', 'Shop license number')}
              {field('securityDeposit', 'Security deposit')}
              {field('instrumentNo', 'Instrument / cheque no.')}
            </>
          )}

          {(tab === 'sales-heads' || tab === 'sales-officers') && (
            <>
              {field('area', 'Region / Area')}
              {field('subArea', 'Sub-area')}
              {tab === 'sales-officers' && (
                <div className="space-y-1.5">
                  <Label>Reports to (Sales Head)<span className="text-destructive"> *</span></Label>
                  <Select value={form.reportsToId ?? ''} onValueChange={(v) => set('reportsToId', v)}>
                    <SelectTrigger><SelectValue placeholder="Assign sales head" /></SelectTrigger>
                    <SelectContent>
                      {(salesHeads.data ?? []).map((h) => (
                        <SelectItem key={h.id} value={h.id}>{h.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.reportsToId ? <p className="text-xs text-destructive">{errors.reportsToId}</p> : null}
                </div>
              )}
            </>
          )}

          {(tab === 'distributors' || tab === 'retailers') && (
            <>
              <div className="space-y-1.5">
                <Label>Onboarding status</Label>
                <Select value={form.onboardingStatus ?? 'PENDING'} onValueChange={(v) => set('onboardingStatus', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.onboardingStatus === 'REJECTED' &&
                field('onboardingNote', 'Rejection reason', { required: true })}
            </>
          )}

          <div className="space-y-1.5">
            <Label>Activation status</Label>
            <Select value={form.status ?? 'ACTIVE'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>{pending ? 'Saving…' : 'Onboard'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
