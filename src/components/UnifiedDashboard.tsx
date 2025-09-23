import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  Store,
  Wrench,
  Settings,
  Truck,
  CreditCard,
  User,
  Building2,
  LogOut,
  Edit,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Import dashboard components
import BuyerDashboard from "@/components/dashboards/BuyerDashboard";
import RobotSellerDashboard from "@/components/dashboards/RobotSellerDashboard";
import SparePartsDashboard from "@/pages/SparePartsSellerDashboard";
import ServiceProviderDashboard from "@/components/dashboards/ServiceProviderDashboard";
import LogisticsProviderDashboard from "@/components/dashboards/LogisticsProviderDashboard";
import FinanceProviderDashboard from "@/components/dashboards/FinanceProviderDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";

interface UnifiedDashboardProps {
  userProfile: any;
}

const UnifiedDashboard = ({ userProfile }: UnifiedDashboardProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("");

  // Get user roles - prioritize user_roles array, fallback to legacy fields
  const userRoles = userProfile?.user_roles?.length > 0 
    ? userProfile.user_roles 
    : [userProfile?.user_type || userProfile?.account_type || 'buyer'];

  // Check if user is admin
  const isAdmin = user?.email === 'mark.it@keyleerkorb.com' || user?.email === 'mynameisrajan@gmail.com';
  
  // If admin, add admin role
  const finalRoles = isAdmin ? ['admin', ...userRoles.filter(role => role !== 'admin')] : userRoles;

  useEffect(() => {
    // Set initial active tab to first role
    if (finalRoles.length > 0 && !activeTab) {
      setActiveTab(finalRoles[0]);
    }
  }, [finalRoles, activeTab]);

  const roleConfigs = {
    admin: {
      label: 'Admin',
      icon: Settings,
      component: AdminDashboard,
      description: 'System administration'
    },
    buyer: {
      label: 'Buyer',
      icon: ShoppingCart,
      component: BuyerDashboard,
      description: 'Browse and purchase robots'
    },
    robot_seller: {
      label: 'Robot Seller',
      icon: Store,
      component: RobotSellerDashboard,
      description: 'Manage robot listings'
    },
    seller: {
      label: 'Robot Seller',
      icon: Store,
      component: RobotSellerDashboard,
      description: 'Manage robot listings'
    },
    spare_parts_seller: {
      label: 'Parts Seller',
      icon: Settings,
      component: SparePartsDashboard,
      description: 'Manage spare parts'
    },
    service_provider: {
      label: 'Service Provider',
      icon: Wrench,
      component: ServiceProviderDashboard,
      description: 'Manage service offerings'
    },
    logistics_provider: {
      label: 'Logistics',
      icon: Truck,
      component: LogisticsProviderDashboard,
      description: 'Manage shipments'
    },
    logistics: {
      label: 'Logistics',
      icon: Truck,
      component: LogisticsProviderDashboard,
      description: 'Manage shipments'
    },
    finance_provider: {
      label: 'Financing',
      icon: CreditCard,
      component: FinanceProviderDashboard,
      description: 'Manage loan programs'
    },
    finance: {
      label: 'Financing',
      icon: CreditCard,
      component: FinanceProviderDashboard,
      description: 'Manage loan programs'
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileEdit = () => {
    navigate('/profile-settings');
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userName = userProfile?.full_name || userProfile?.display_name || user?.email || 'User';
  const companyName = userProfile?.company_name || 'RobotVerse';

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Company Name and User Menu */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{companyName}</h1>
              <p className="text-sm text-muted-foreground">Industrial Robotics Platform</p>
            </div>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">{userName}</p>
                                  </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover">
              <DropdownMenuLabel>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{userName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleProfileEdit}>
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleProfileEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleProfileEdit}>
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Real Data Notification */}
        {/*<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          ✅ All dashboard data is now live from your Supabase database - showing real robots, parts, services, and analytics.
        </div>*/}
        {/* Always show Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(finalRoles.length, 5)}, 1fr)` }}>
            {finalRoles.slice(0, 5).map((role: string) => {
              const config = roleConfigs[role];
              if (!config) return null;
              
              return (
                <TabsTrigger 
                  key={role} 
                  value={role}
                  className="flex items-center justify-center py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <span className="text-sm font-medium">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {finalRoles.map((role: string) => {
            const config = roleConfigs[role];
            if (!config) return null;
            
            const DashboardComponent = config.component;
            return (
              <TabsContent key={role} value={role} className="space-y-6">
                <DashboardComponent userProfile={userProfile} />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default UnifiedDashboard;