import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  Building, 
  Settings, 
  Plus, 
  Edit, 
  Bot, 
  Wrench, 
  Package,
  CreditCard,
  Truck,
  LogOut,
  MoreVertical,
  Bell,
  HelpCircle,
  BarChart3,
  FileText,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardProfile } from './DashboardProfile';
import { useAuth } from '@/hooks/useAuth';

interface DashboardHeaderProps {
  userProfile: any;
  onProfileUpdate: () => void;
}

export function DashboardHeader({ userProfile, onProfileUpdate }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const getUserRoles = () => {
    return userProfile?.user_roles || [userProfile?.user_type || 'buyer'];
  };

  const getCreateListingOptions = () => {
    const roles = getUserRoles();
    const options = [];

    if (roles.includes('robot_seller') || roles.includes('seller')) {
      options.push({
        label: 'List Robot',
        icon: Bot,
        path: '/robots',
        description: 'Add a new robot listing'
      });
    }

    if (roles.includes('spare_parts_seller') || roles.includes('seller')) {
      options.push({
        label: 'List Spare Part',
        icon: Package,
        path: '/parts',
        description: 'Add a new spare part listing'
      });
    }

    if (roles.includes('service_provider')) {
      options.push({
        label: 'Add Service',
        icon: Wrench,
        path: '/services',
        description: 'Add a new service offering'
      });
    }

    if (roles.includes('finance_provider')) {
      options.push({
        label: 'Add Loan Product',
        icon: CreditCard,
        path: '/finance',
        description: 'Add a new financing option'
      });
    }

    if (roles.includes('logistics_provider')) {
      options.push({
        label: 'Add Logistics Service',
        icon: Truck,
        path: '/logistics',
        description: 'Add a new shipping service'
      });
    }

    return options;
  };

  const createOptions = getCreateListingOptions();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (showProfile) {
    return (
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => setShowProfile(false)}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <DashboardProfile 
          userProfile={userProfile} 
          onProfileUpdate={() => {
            onProfileUpdate();
            setShowProfile(false);
          }} 
        />
      </div>
    );
  }

  return (
    <Card className="bg-primary/5">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Company Info */}
          <div className="flex items-center gap-4">
            {/* Company Logo */}
            <div className="w-16 h-16 rounded-lg bg-background border-2 flex items-center justify-center overflow-hidden">
              {userProfile?.company_logo_url ? (
                <img 
                  src={userProfile.company_logo_url} 
                  alt="Company Logo" 
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Building className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            
            {/* Company Details */}
            <div>
              <h1 className="text-2xl font-bold">
                {userProfile?.company_name || userProfile?.full_name || 'Your Company'}
              </h1>
              <p className="text-muted-foreground">
                {userProfile?.location || 'Location not set'}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {getUserRoles().map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Professional Dashboard Menu */}
          <div className="flex items-center gap-4">
            {/* Quick Actions */}
            <div className="hidden lg:flex gap-2">
              {createOptions.slice(0, 2).map((option) => {
                const Icon = option.icon;
                return (
                  <Button 
                    key={option.label}
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(option.path)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-[10px] flex items-center justify-center text-primary-foreground">
                3
              </span>
            </Button>

            {/* Professional Dashboard Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 px-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {userProfile?.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent 
                align="end" 
                className="w-64 bg-background border shadow-lg z-50"
                sideOffset={8}
              >
                <DropdownMenuLabel className="px-4 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {userProfile?.avatar_url ? (
                        <img 
                          src={userProfile.avatar_url} 
                          alt="Profile" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {userProfile?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {userProfile?.email || 'user@example.com'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuItem onClick={() => navigate('/profile-settings')} className="px-4 py-3 cursor-pointer">
                  <User className="w-4 h-4 mr-3" />
                  <span>My Profile</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/profile-settings')} className="px-4 py-3 cursor-pointer">
                  <Settings className="w-4 h-4 mr-3" />
                  <span>Account Settings</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="px-4 py-3 cursor-pointer">
                  <BarChart3 className="w-4 h-4 mr-3" />
                  <span>Analytics</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="px-4 py-3 cursor-pointer">
                  <FileText className="w-4 h-4 mr-3" />
                  <span>Reports</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {createOptions.length > 0 && (
                  <>
                    <DropdownMenuLabel className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Quick Actions
                    </DropdownMenuLabel>
                    {createOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <DropdownMenuItem 
                          key={option.label}
                          onClick={() => navigate(option.path)} 
                          className="px-4 py-3 cursor-pointer"
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          <span>{option.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onClick={() => navigate('/help')} className="px-4 py-3 cursor-pointer">
                  <HelpCircle className="w-4 h-4 mr-3" />
                  <span>Help & Support</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/privacy')} className="px-4 py-3 cursor-pointer">
                  <Shield className="w-4 h-4 mr-3" />
                  <span>Privacy Policy</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  className="px-4 py-3 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}