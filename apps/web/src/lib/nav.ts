import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Building2,
  Store,
  Route as RouteIcon,
  UsersRound,
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
        roles: ['ADMIN', 'SALES_HEAD'],
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
];

export function visibleSections(role: Role | null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((i) => !i.roles || (role && i.roles.includes(role))),
  })).filter((s) => s.items.length > 0);
}
