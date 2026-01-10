import { NavLink, useLocation } from 'react-router-dom';
import { User, CreditCard, Settings, Crown, Bell, Shield, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const menuItems = [
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
    description: 'Plans & billing'
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
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
    description: 'App preferences'
  },
];

export const DashboardSettingsSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  return (
    <aside className="w-72 min-h-screen bg-card border-r border-border flex flex-col">
      {/* User Profile Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(user?.email || '')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href + item.label}>
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-primary/10 text-primary border-l-4 border-primary'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="flex-1">
                    <p className={cn('font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
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
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};
