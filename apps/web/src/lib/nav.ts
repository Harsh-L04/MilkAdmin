import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Building2,
  Store,
  Route as RouteIcon,
  UsersRound,
  Gift,
  Wallet,
  FileSpreadsheet,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@moderns-milk/contracts';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, only these roles see the item. Empty/undefined = everyone. */
  roles?: Role[];
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

/**
 * Navigation is scoped to the modules that have real backing APIs today
 * (dashboard, ordering, catalog). New modules slot in here as the backend grows.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Orders', href: '/orders', icon: ClipboardList },
      {
        label: 'Sample orders',
        href: '/sample-orders',
        icon: Gift,
        roles: ['ADMIN', 'SALES_HEAD', 'SALES_OFFICER'],
      },
      { label: 'Payment logs', href: '/payments', icon: Wallet },
      {
        label: 'Order summary',
        href: '/reports/order-summary',
        icon: FileSpreadsheet,
        roles: ['ADMIN', 'SALES_HEAD'],
      },
      { label: 'Sales visits', href: '/sales-visits', icon: RouteIcon },
      { label: 'Products', href: '/products', icon: Package },
    ],
  },
  {
    heading: 'Network',
    items: [
      {
        label: 'User management',
        href: '/users',
        icon: UsersRound,
        roles: ['ADMIN', 'SALES_HEAD', 'SALES_OFFICER'],
      },
      {
        label: 'Distributors',
        href: '/distributors',
        icon: Building2,
        roles: ['ADMIN', 'SALES_HEAD'],
      },
      {
        label: 'Retailers',
        href: '/retailers',
        icon: Store,
        roles: ['ADMIN', 'SALES_HEAD'],
      },
    ],
  },
  {
    heading: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: SettingsIcon }],
  },
];

export function visibleSections(role: Role | null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((i) => !i.roles || (role && i.roles.includes(role))),
  })).filter((s) => s.items.length > 0);
}
