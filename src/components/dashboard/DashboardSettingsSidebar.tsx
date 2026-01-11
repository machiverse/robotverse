import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { Crown, LogOut, CreditCard, History, ShoppingCart, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  {
    label: 'Credits Overview',
    icon: Coins,
    href: '/dashboard/credits',
    description: 'Your credit balance',
    tab: null
  },
  {
    label: 'Subscription Plans',
    icon: Crown,
    href: '/dashboard/credits',
    description: 'Upgrade your plan',
    tab: 'plans'
  },
  {
    label: 'Buy Credits',
    icon: ShoppingCart,
    href: '/dashboard/credits',
    description: 'Purchase credit packs',
    tab: 'packs'
  },
  {
    label: 'Transaction History',
    icon: History,
    href: '/dashboard/credits',
    description: 'View all transactions',
    tab: 'history'
  },
];

export const DashboardSettingsSidebar = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const currentTab = searchParams.get('tab');

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  const isItemActive = (item: typeof menuItems[0]) => {
    if (item.tab === null) {
      return location.pathname === item.href && !currentTab;
    }
    return currentTab === item.tab;
  };

  return (
    <aside className="w-72 min-h-screen bg-card border-r border-border flex flex-col shadow-sm">
      {/* User Profile Header */}
      <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 ring-2 ring-primary/30 shadow-lg">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg">
              {getInitials(user?.email || '')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate text-lg">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email || 'user@example.com'}
            </p>
            <Badge variant="secondary" className="mt-1 text-xs bg-primary/10 text-primary border-primary/20">
              Free Plan
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-4">
          Billing & Credits
        </p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            const linkHref = item.tab ? `${item.href}?tab=${item.tab}` : item.href;

            return (
              <li key={item.label}>
                <NavLink
                  to={linkHref}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                    'hover:bg-accent/50 hover:text-accent-foreground',
                    isActive && 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted group-hover:bg-primary/10'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      {/* Back to Dashboard */}
      <div className="p-4 space-y-2">
        <NavLink to="/dashboard">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 rounded-xl py-3"
          >
            <CreditCard className="h-4 w-4" />
            <span className="font-medium">Back to Dashboard</span>
          </Button>
        </NavLink>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl py-3"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};
