import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardProfile } from './DashboardProfile';

interface DashboardHeaderProps {
  userProfile: any;
  onProfileUpdate: () => void;
}

export function DashboardHeader({ userProfile, onProfileUpdate }: DashboardHeaderProps) {
  const navigate = useNavigate();
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
    <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
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
                  className="w-full h-full object-contain"
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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>

            {createOptions.length > 0 && (
              <div className="flex gap-2">
                {createOptions.slice(0, 2).map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button 
                      key={option.label}
                      onClick={() => navigate(option.path)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </Button>
                  );
                })}
                
                {createOptions.length > 2 && (
                  <Button variant="outline" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    More
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}