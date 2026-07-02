'use client';

import * as React from 'react';
import { Link2, UsersRound } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ReconcileDialog({ open, onClose }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [userId, setUserId] = React.useState('');
  const [distributorId, setDistributorId] = React.useState('');

  const { data: unlinked, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin', 'unlinked-users'],
    queryFn: ({ signal }) => api.admin.unlinkedUsers(signal),
    enabled: open,
  });

  const { data: distributors } = useQuery({
    queryKey: ['admin', 'distributors'],
    queryFn: ({ signal }) => api.admin.distributors(signal),
    enabled: open,
  });

  const { mutate: linkUser, isPending: linking } = useMutation({
    mutationFn: ({ userId, distributorId }: { userId: string; distributorId: string }) =>
      api.admin.linkUser(userId, distributorId),
    onSuccess: () => {
      toast({ title: 'User linked to distributor', variant: 'success' });
      setUserId('');
      setDistributorId('');
      qc.invalidateQueries({ queryKey: ['admin', 'unlinked-users'] });
    },
    onError: (err) => {
      toast({ title: 'Could not link user', description: (err as Error)?.message, variant: 'destructive' });
    },
  });

  const selectedUser = unlinked?.find((u) => u.id === userId);
  const filteredDistributors = React.useMemo(
    () => (distributors ?? []).filter((d) => d.status === 'ACTIVE'),
    [distributors],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reconcile unlinked users</DialogTitle>
          <DialogDescription>
            Assign SALES_OFFICER and DISTRIBUTOR users who are not yet linked to a
            distributor. Their current sessions will be invalidated so they re-login
            with the updated permissions.
          </DialogDescription>
        </DialogHeader>

        {loadingUsers ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : unlinked && unlinked.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {unlinked.map((u) => (
              <div
                key={u.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  userId === u.id ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{u.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {u.phone} &middot; {u.role === 'SALES_OFFICER' ? 'Sales Officer' : 'Distributor'}
                    {u.area ? ` · ${u.area}` : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUserId(u.id);
                    setDistributorId('');
                  }}
                >
                  {userId === u.id ? 'Selected' : 'Select'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UsersRound}
            title="All users are linked"
            description="Every SALES_OFFICER and DISTRIBUTOR user is already assigned to a distributor."
          />
        )}

        {userId && unlinked && unlinked.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Link {selectedUser?.name} to:</label>
            <Select value={distributorId} onValueChange={setDistributorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a distributor…" />
              </SelectTrigger>
              <SelectContent>
                {filteredDistributors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            disabled={!userId || !distributorId || linking}
            onClick={() => linkUser({ userId, distributorId })}
          >
            <Link2 />
            {linking ? 'Linking…' : 'Link user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
