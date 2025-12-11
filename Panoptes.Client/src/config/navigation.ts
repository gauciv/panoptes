import { Home, BarChart3, Settings, Activity, LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
  group: 'primary' | 'secondary';
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  // Primary Navigation
  {
    label: 'Overview',
    path: '/dashboard',
    icon: Home,
    group: 'primary',
  },
  {
    label: 'Analytics',
    path: '/dashboard/analytics',
    icon: BarChart3,
    group: 'primary',
  },
  {
    label: 'Health',
    path: '/dashboard/health',
    icon: Activity,
    group: 'primary',
  },
  
  // Secondary/Utilities
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: Settings,
    group: 'secondary',
  },
];

export const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter(item => item.group === 'primary');
export const SECONDARY_NAV_ITEMS = NAV_ITEMS.filter(item => item.group === 'secondary');
