import React, { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Bot, Wrench, Activity, ShoppingCart, Briefcase, Truck, DollarSign, RefreshCw } from "lucide-react";

interface AdminOverviewProps {
  dashboardStats: any;
  onRefresh: () => void;
}

const AdminOverview = React.memo(({ dashboardStats, onRefresh }: AdminOverviewProps) => {
  const handleQuickAction = useCallback((action: string) => {
    console.log(`Quick action: ${action}`);
    // Implement navigation or modal opening logic here
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive platform management and analytics</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buyers</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.buyers}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sellers</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.sellers}</p>
              </div>
              <Briefcase className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.serviceProviders}</p>
              </div>
              <Wrench className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Logistics</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.logistics}</p>
              </div>
              <Truck className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finance</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats.users.finance}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Equipment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Robots:</span>
                <span className="font-semibold text-foreground">{dashboardStats.equipment.totalRobots}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Parts:</span>
                <span className="font-semibold text-foreground">{dashboardStats.equipment.totalSpareParts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Services:</span>
                <span className="font-semibold text-foreground">{dashboardStats.equipment.totalServices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Value:</span>
                <span className="font-semibold text-primary">₹{dashboardStats.equipment.totalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Listings:</span>
                <span className="font-semibold text-green-600">{dashboardStats.equipment.activeListings}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Users:</span>
                <span className="font-semibold text-foreground">{dashboardStats.users.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New This Month:</span>
                <span className="font-semibold text-green-600">{dashboardStats.users.newThisMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admin Users:</span>
                <span className="font-semibold text-red-600">{dashboardStats.users.admins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completion Rate:</span>
                <span className="font-semibold text-primary">
                  {dashboardStats.users.total > 0 ? 
                    ((dashboardStats.users.active / dashboardStats.users.total) * 100).toFixed(1) + '%' : 
                    '0%'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-16 flex-col"
              onClick={() => handleQuickAction('users')}
            >
              <Users className="h-6 w-6 mb-2" />
              Manage Users
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex-col"
              onClick={() => handleQuickAction('equipment')}
            >
              <Bot className="h-6 w-6 mb-2" />
              View Equipment
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex-col"
              onClick={() => handleQuickAction('analytics')}
            >
              <Activity className="h-6 w-6 mb-2" />
              View Analytics
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex-col"
              onClick={() => handleQuickAction('reports')}
            >
              <DollarSign className="h-6 w-6 mb-2" />
              Financial Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

AdminOverview.displayName = 'AdminOverview';
export default AdminOverview;
