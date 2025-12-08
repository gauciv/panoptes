import { Link, useLocation } from 'react-router-dom';
import { NavItem } from '../config/navigation';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';

interface SideNavItemProps {
  item: NavItem;
  isCollapsed: boolean;
  onClick?: () => void;
}

export function SideNavItem({ item, isCollapsed, onClick }: SideNavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  const Icon = item.icon;

  const content = (
    <>
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate font-mono text-sm">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <Badge variant="default" className="ml-auto font-mono">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </>
  );

  const className = cn(
    'flex items-center gap-3 px-4 py-3 rounded-tech transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel focus-visible:ring-offset-2',
    isCollapsed ? 'justify-center' : 'justify-start',
    item.disabled
      ? 'opacity-50 cursor-not-allowed text-muted-foreground'
      : isActive
      ? 'bg-sentinel/10 text-sentinel border-l-4 border-sentinel font-medium'
      : 'text-foreground hover:bg-accent hover:text-accent-foreground border-l-4 border-transparent'
  );

  if (item.disabled) {
    return (
      <div
        className={className}
        title={isCollapsed ? item.label : undefined}
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={item.path}
      className={className}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? item.label : undefined}
      onClick={onClick}
    >
      {content}
    </Link>
  );
}
