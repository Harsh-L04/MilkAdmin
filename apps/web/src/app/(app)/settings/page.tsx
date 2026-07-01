'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useOrderDeadline, useSetOrderDeadline } from '@/features/settings/use-settings';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const { toast } = useToast();
  const { data, isLoading } = useOrderDeadline();
  const setMut = useSetOrderDeadline();

  const [time, setTime] = React.useState('');
  React.useEffect(() => {
    if (data) setTime(data.time ?? '');
  }, [data]);

  async function save() {
    try {
      await setMut.mutateAsync({ time });
      toast({ title: 'Deadline saved', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not save', description: (err as Error)?.message, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Global platform configuration." />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h3 className="font-medium">Order placement deadline</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            The daily cut-off after which distributors and retailers can no longer submit
            orders. Leave empty for no deadline.
          </p>

          {isLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deadline">Cut-off time</Label>
                <Input
                  id="deadline"
                  type="time"
                  value={time}
                  disabled={!isAdmin}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              {isAdmin && (
                <Button onClick={save} disabled={setMut.isPending}>
                  {setMut.isPending ? 'Saving…' : 'Save'}
                </Button>
              )}
            </div>
          )}
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">Only an administrator can change this.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
