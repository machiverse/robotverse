import { NavLink, useLocation } from 'react-router-dom';
import { User, Settings, Crown, Bell, Shield, LogOut, LayoutDashboard, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    description: 'Overview & stats'
  },
  {
    label: 'Account',
    icon: User,
    href: '/profile-settings',
    description: 'Personal information'
  },
  {
    label: 'Subscription & Credits',
    icon: Crown,
    href: '/dashboard/credits',
    description: 'Plans & billing',
    badge: 'Pro'
  },
  {
    label: 'Notifications',
    icon: Bell,
    href: '/dashboard/settings',
    description: 'Alert preferences'
  },
  {
    label: 'Privacy & Security',
    icon: Shield,
    href: '/dashboard/privacy',
    description: 'Security settings'
  },
  {
    label: 'Help & Support',
    icon: HelpCircle,
    href: '/dashboard/help',
    description: 'Get assistance'
  },
];

export const DashboardSettingsSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || 'U';
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
          Settings
        </p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href + item.label}>
                <NavLink
                  to={item.href}
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
                    <div className="flex items-center gap-2">
                      <p className={cn('font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>
                        {item.label}
                      </p>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      {/* Sign Out Button */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl py-3"
          onClick={() => signOut()}
        >
          <div className="p-2 rounded-lg bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};
