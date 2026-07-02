'use client';

import * as React from 'react';
import { Link2, LogOut, Plus, UsersRound } from 'lucide-react';
import type { OnboardedUserRow } from '@moderns-milk/contracts';
import { useOnboardedUsers, type UserTab } from '@/features/onboarding/use-onboarding';
import { OnboardingFormDialog } from '@/features/onboarding/onboarding-form-dialog';
import { ReconcileDialog } from '@/features/users/reconcile-dialog';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import type { Role } from '@moderns-milk/contracts';

// Which roles may see each tab (mirrors the API @Roles guards, so a user never
// lands on a tab that would 403).
const TAB_DEFS: { value: UserTab; label: string; roles: Role[] }[] = [
  { value: 'distributors', label: 'Distributors', roles: ['ADMIN', 'SALES_HEAD', 'SALES_OFFICER'] },
  { value: 'retailers', label: 'Retailers', roles: ['ADMIN', 'SALES_HEAD', 'SALES_OFFICER'] },
  { value: 'sales-heads', label: 'Sales Heads', roles: ['ADMIN'] },
  { value: 'sales-officers', label: 'Sales Officers', roles: ['ADMIN', 'SALES_HEAD'] },
];

const ONBOARDING_VARIANT: Record<string, BadgeVariant> = {
  ONBOARDED: 'success',
  PROSPECTIVE: 'info',
  PENDING: 'warning',
  REJECTED: 'destructive',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function UsersPage() {
  const { role } = useAuth();
  const tabs = React.useMemo(
    () => TAB_DEFS.filter((t) => !role || t.roles.includes(role)),
    [role],
  );
  const [tab, setTab] = React.useState<UserTab>('distributors');
  const [search, setSearch] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [reconcileOpen, setReconcileOpen] = React.useState(false);

  // Keep the active tab valid if the visible set changes with the role.
  React.useEffect(() => {
    const first = tabs[0];
    if (first && !tabs.some((t) => t.value === tab)) setTab(first.value);
  }, [tabs, tab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="Onboard and manage distributors, retailers, sales heads and sales officers."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReconcileOpen(true)}>
              <Link2 />
              Reconcile
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              Add user
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as UserTab)}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <Card>
              <div className="border-b border-border p-4">
                <SearchInput
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search by name or phone…"
                  containerClassName="sm:max-w-xs"
                />
              </div>
              <CardContent className="p-0">
                {t.value === tab ? <UserTable tab={tab} search={search} /> : null}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <OnboardingFormDialog open={formOpen} tab={tab} onClose={() => setFormOpen(false)} />
      <ReconcileDialog open={reconcileOpen} onClose={() => setReconcileOpen(false)} />
    </div>
  );
}

function UserTable({ tab, search }: { tab: UserTab; search: string }) {
  const { data, isLoading, isError, error } = useOnboardedUsers(tab, search);
  const isStaff = tab === 'sales-heads' || tab === 'sales-officers';
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = React.useState<string | null>(null);

  const handleForceLogout = async (userId: string, name: string) => {
    if (!window.confirm(`Force logout ${name}? This will invalidate all their active sessions.`)) return;
    setLoggingOut(userId);
    try {
      await api.admin.forceLogout(userId);
      toast({ title: `${name} logged out`, variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not force logout', description: (err as Error)?.message, variant: 'destructive' });
    } finally {
      setLoggingOut(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Couldn’t load users"
        description={(error as Error)?.message ?? 'Please try again.'}
      />
    );
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    return <EmptyState icon={UsersRound} title="No users yet" description="Add one with the button above." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          {tab === 'retailers' && <TableHead>Outlet</TableHead>}
          {tab === 'retailers' && <TableHead>Distributor</TableHead>}
          {tab === 'sales-officers' && <TableHead>Reports to</TableHead>}
          {tab === 'sales-heads' && <TableHead>Sales officers</TableHead>}
          <TableHead>Area</TableHead>
          <TableHead>Onboarded</TableHead>
          {!isStaff && <TableHead>Onboarding</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r: OnboardedUserRow) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.fullName}</TableCell>
            <TableCell>{r.phone || '—'}</TableCell>
            {tab === 'retailers' && <TableCell>{String(r.extra?.outlet ?? '—')}</TableCell>}
            {tab === 'retailers' && <TableCell>{String(r.extra?.distributor ?? '—')}</TableCell>}
            {tab === 'sales-officers' && <TableCell>{String(r.extra?.reportsTo ?? '—')}</TableCell>}
            {tab === 'sales-heads' && <TableCell>{String(r.extra?.salesOfficers ?? 0)}</TableCell>}
            <TableCell>{r.area ?? r.subArea ?? '—'}</TableCell>
            <TableCell>{fmtDate(r.onboardedOn)}</TableCell>
            {!isStaff && (
              <TableCell>
                {r.onboardingStatus ? (
                  <Badge variant={ONBOARDING_VARIANT[r.onboardingStatus] ?? 'muted'}>
                    {r.onboardingStatus[0] + r.onboardingStatus.slice(1).toLowerCase()}
                  </Badge>
                ) : '—'}
              </TableCell>
            )}
            <TableCell>
              <Badge variant={r.status === 'ACTIVE' ? 'success' : 'muted'}>
                {r.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                disabled={loggingOut === r.id}
                onClick={() => handleForceLogout(r.id, r.fullName)}
                title="Force logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
