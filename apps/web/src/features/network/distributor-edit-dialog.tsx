'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type DistributorRow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  distributor: DistributorRow | null;
  onClose: () => void;
}

export function DistributorEditDialog({ distributor, onClose }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [status, setStatus] = React.useState('ACTIVE');

  React.useEffect(() => {
    if (distributor) {
      setName(distributor.name);
      setCode(distributor.code);
      setRegion(distributor.region ?? '');
      setAddress(distributor.address ?? '');
      setStatus(distributor.status);
    }
  }, [distributor]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.admin.updateDistributor(distributor!.id, {
        name: name !== distributor?.name ? name : undefined,
        code: code !== distributor?.code ? code : undefined,
        region: region !== distributor?.region ? (region || null) as unknown as undefined : undefined,
        address: address !== distributor?.address ? (address || null) as unknown as undefined : undefined,
        status: status !== distributor?.status ? status : undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Distributor updated', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['admin', 'distributors'] });
      onClose();
    },
    onError: (err) => {
      toast({ title: 'Could not update', description: (err as Error)?.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={!!distributor} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit distributor</DialogTitle>
          <DialogDescription>Update distributor details.</DialogDescription>
        </DialogHeader>

        {!distributor ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="region">Region</Label>
              <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutate()} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
