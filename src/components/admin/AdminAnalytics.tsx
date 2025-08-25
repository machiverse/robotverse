import React, { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp, Users, Bot } from "lucide-react";

interface AdminAnalyticsProps {
  dashboardStats: any;
  users: any[];
}

const AdminAnalytics = React.memo(({ dashboardStats, users }: AdminAnalyticsProps) => {
  const analyticsData = useMemo(() => {
    const totalUsers = dashboardStats.users.total;
    
    const userDistribution = [
      { label: 'Buyers', count: dashboardStats.users.buyers, color: 'text-green-600' },
      { label: 'Sellers', count: dashboardStats.users.sellers, color: 'text-purple-600' },
      { label: 'Service Providers', count: dashboardStats.users.serviceProviders, color: 'text-orange-600' },
      { label: 'Logistics Providers', count: dashboardStats.users.logistics, color: 'text-cyan-600' },
      { label: 'Finance Providers', count: dashboardStats.users.finance, color: 'text-emerald-600' },
    ];

    const platformMetrics = [
      { label: 'Total Platform Value', value: `₹${dashboardStats.equipment.totalValue.toLocaleString()}`, type: 'currency' },
      { label: 'Active Listings', value: dashboardStats.equipment.activeListings, type: 'number' },
      { 
        label: 'User Completion Rate', 
        value: totalUsers > 0 ? `${((dashboardStats.users.active / totalUsers) * 100).toFixed(1)}%` : '0%',
        type: 'percentage'
      },
      { label: 'New Users This Month', value: dashboardStats.users.newThisMonth, type: 'number' },
      { label: 'Items Sold This Month', value: dashboardStats.equipment.soldThisMonth, type: 'number' },
    ];

    const equipmentData = [
      { label: 'Total Robots', value: dashboardStats.equipment.totalRobots, color: 'text-primary' },
      { label: 'Spare Parts', value: dashboardStats.equipment.totalSpareParts, color: 'text-secondary' },
      { label: 'Services', value: dashboardStats.equipment.totalServices, color: 'text-accent' },
    ];

    return { userDistribution, platformMetrics, equipmentData, totalUsers };
  }, [dashboardStats]);

  const calculatePercentage = useCallback((count: number, total: number): string => {
    return total > 0 ? (count / total * 100).toFixed(1) : '0';
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics & Reports</h2>
        <p className="text-muted-foreground">Detailed platform analytics and user insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.userDistribution.map((category, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <span className="text-sm text-muted-foreground">{category.label}</span>
                  <div className="text-right">
                    <span className={`font-semibold ${category.color}`}>{category.count}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({calculatePercentage(category.count, analyticsData.totalUsers)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Platform Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.platformMetrics.map((metric, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-muted-foreground">{metric.label}:</span>
                  <span className={`font-semibold ${
                    metric.type === 'currency' ? 'text-primary' : 
                    metric.type === 'percentage' ? 'text-primary' : 
                    'text-green-600'
                  }`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Equipment Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.equipmentData.map((equipment, index) => (
              <div key={index} className="text-center p-4 border rounded">
                <p className={`text-2xl font-bold ${equipment.color}`}>{equipment.value}</p>
                <p className="text-sm text-muted-foreground">{equipment.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

AdminAnalytics.displayName = 'AdminAnalytics';
export default AdminAnalytics;
