'use client';

import * as React from 'react';
import { Plus, UsersRound } from 'lucide-react';
import type { OnboardedUserRow } from '@moderns-milk/contracts';
import { useOnboardedUsers, type UserTab } from '@/features/onboarding/use-onboarding';
import { OnboardingFormDialog } from '@/features/onboarding/onboarding-form-dialog';
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

const TABS: { value: UserTab; label: string }[] = [
  { value: 'distributors', label: 'Distributors' },
  { value: 'retailers', label: 'Retailers' },
  { value: 'sales-heads', label: 'Sales Heads' },
  { value: 'sales-officers', label: 'Sales Officers' },
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
  const [tab, setTab] = React.useState<UserTab>('distributors');
  const [search, setSearch] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="Onboard and manage distributors, retailers, sales heads and sales officers."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            Add user
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as UserTab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
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
    </div>
  );
}

function UserTable({ tab, search }: { tab: UserTab; search: string }) {
  const { data, isLoading, isError, error } = useOnboardedUsers(tab, search);
  const isStaff = tab === 'sales-heads' || tab === 'sales-officers';

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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
