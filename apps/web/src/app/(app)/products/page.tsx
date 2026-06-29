'use client';

import * as React from 'react';
import {
  Ban,
  CheckCircle2,
  MoreHorizontal,
  Package,
  PackageX,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react';
import type { ProductCategory, ProductDto } from '@moderns-milk/contracts';
import { useProducts, useUpdateProduct } from '@/features/catalog/use-products';
import { ProductFormDialog } from '@/features/catalog/product-form-dialog';
import { ApiError } from '@/lib/api';
import { formatQty, humanizeEnum } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

type CategoryFilter = ProductCategory | 'ALL';
type ActiveFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';

function CategoryBadge({ category }: { category: ProductCategory }) {
  return (
    <Badge variant={category === 'MILK' ? 'info' : 'secondary'}>{humanizeEnum(category)}</Badge>
  );
}

function ProductMeta({ p }: { p: ProductDto }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <CategoryBadge category={p.category} />
      {p.isReturnablePack && (
        <Badge variant="muted">
          <RotateCcw className="size-3" /> Returnable
        </Badge>
      )}
      {p.active ? (
        <Badge variant="success" dot>
          Active
        </Badge>
      ) : (
        <Badge variant="muted" dot>
          Inactive
        </Badge>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState<CategoryFilter>('ALL');
  const [active, setActive] = React.useState<ActiveFilter>('ACTIVE');

  const query = React.useMemo(
    () => ({
      category: category === 'ALL' ? undefined : category,
      active: active === 'ALL' ? undefined : active === 'ACTIVE',
    }),
    [category, active],
  );
  const { data, isLoading, isError, error, refetch } = useProducts(query);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [data, search]);

  // Create / edit dialog: `editing === null` while closed, a product when
  // editing, and `undefined` (with formOpen) when creating.
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductDto | null>(null);
  const [toggling, setToggling] = React.useState<ProductDto | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: ProductDto) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Catalog of milk and dairy SKUs available for ordering."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add product
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search by name or SKU…"
            containerClassName="sm:max-w-xs"
          />
          <div className="flex gap-3 sm:ml-auto">
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
              <SelectTrigger className="w-[140px]" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                <SelectItem value="MILK">Milk</SelectItem>
                <SelectItem value="DAIRY">Dairy</SelectItem>
              </SelectContent>
            </Select>
            <Select value={active} onValueChange={(v) => setActive(v as ActiveFilter)}>
              <SelectTrigger className="w-[130px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ALL">All status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={PackageX}
              title="Couldn’t load products"
              description={(error as Error)?.message ?? 'Please try again.'}
              action={
                <button className="text-sm font-medium text-primary underline" onClick={() => refetch()}>
                  Retry
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description={
                search ? 'Try a different search or filter.' : 'No products match these filters.'
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Pack size</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Attributes</TableHead>
                      <TableHead className="w-12 text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.sku}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatQty(p.packSize)} {humanizeEnum(p.uom)}
                        </TableCell>
                        <TableCell className="tabular-nums">{Number(p.taxRate)}%</TableCell>
                        <TableCell>
                          <ProductMeta p={p} />
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions
                            product={p}
                            onEdit={() => openEdit(p)}
                            onToggle={() => setToggling(p)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-border md:hidden">
                {filtered.map((p) => (
                  <li key={p.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatQty(p.packSize)} {humanizeEnum(p.uom)}
                        </span>
                        <RowActions
                          product={p}
                          onEdit={() => openEdit(p)}
                          onToggle={() => setToggling(p)}
                        />
                      </div>
                    </div>
                    <ProductMeta p={p} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {!isLoading && !isError && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} product{filtered.length === 1 ? '' : 's'}
        </p>
      )}

      <ProductFormDialog
        open={formOpen}
        product={editing}
        onClose={() => setFormOpen(false)}
      />

      <ToggleActiveDialog product={toggling} onClose={() => setToggling(null)} />
    </div>
  );
}

function RowActions({
  product,
  onEdit,
  onToggle,
}: {
  product: ProductDto;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${product.name}`}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggle}>
          {product.active ? <Ban /> : <CheckCircle2 />}
          {product.active ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToggleActiveDialog({
  product,
  onClose,
}: {
  product: ProductDto | null;
  onClose: () => void;
}) {
  const updateMut = useUpdateProduct();
  const { toast } = useToast();
  const deactivating = product?.active ?? false;

  async function confirm() {
    if (!product) return;
    try {
      await updateMut.mutateAsync({ id: product.id, input: { active: !product.active } });
      toast({
        variant: 'success',
        title: deactivating ? 'Product deactivated' : 'Product activated',
        description: `${product.name} (${product.sku}) updated.`,
      });
      onClose();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {deactivating ? 'Deactivate this product?' : 'Activate this product?'}
          </DialogTitle>
          <DialogDescription>
            {product?.name} ({product?.sku}).{' '}
            {deactivating
              ? 'It will be hidden from ordering but kept for historical records. You can reactivate it anytime.'
              : 'It will become available for ordering again.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMut.isPending}>
            Cancel
          </Button>
          <Button
            variant={deactivating ? 'destructive' : 'primary'}
            onClick={confirm}
            loading={updateMut.isPending}
          >
            {deactivating ? <Ban /> : <CheckCircle2 />}
            {deactivating ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
