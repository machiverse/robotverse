import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp, Users, Bot } from "lucide-react";

interface AdminAnalyticsProps {
  dashboardStats: any;
  users: any[];
}

const AdminAnalytics = ({ dashboardStats, users }: AdminAnalyticsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics & Reports</h2>
        <p className="text-muted-foreground">Detailed platform analytics and user insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded">
                <span className="text-sm text-muted-foreground">Buyers</span>
                <div className="text-right">
                  <span className="font-semibold text-green-600">{dashboardStats.users.buyers}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({dashboardStats.users.total > 0 ? ((dashboardStats.users.buyers / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 border rounded">
                <span className="text-sm text-muted-foreground">Sellers</span>
                <div className="text-right">
                  <span className="font-semibold text-purple-600">{dashboardStats.users.sellers}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({dashboardStats.users.total > 0 ? ((dashboardStats.users.sellers / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 border rounded">
                <span className="text-sm text-muted-foreground">Service Providers</span>
                <div className="text-right">
                  <span className="font-semibold text-orange-600">{dashboardStats.users.serviceProviders}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({dashboardStats.users.total > 0 ? ((dashboardStats.users.serviceProviders / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 border rounded">
                <span className="text-sm text-muted-foreground">Logistics Providers</span>
                <div className="text-right">
                  <span className="font-semibold text-cyan-600">{dashboardStats.users.logistics}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({dashboardStats.users.total > 0 ? ((dashboardStats.users.logistics / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 border rounded">
                <span className="text-sm text-muted-foreground">Finance Providers</span>
                <div className="text-right">
                  <span className="font-semibold text-emerald-600">{dashboardStats.users.finance}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({dashboardStats.users.total > 0 ? ((dashboardStats.users.finance / dashboardStats.users.total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Platform Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Platform Value:</span>
                <span className="font-semibold text-primary">₹{dashboardStats.equipment.totalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Listings:</span>
                <span className="font-semibold text-green-600">{dashboardStats.equipment.activeListings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User Completion Rate:</span>
                <span className="font-semibold text-primary">
                  {dashboardStats.users.total > 0 ? 
                    ((dashboardStats.users.active / dashboardStats.users.total) * 100).toFixed(1) + '%' : 
                    '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Users This Month:</span>
                <span className="font-semibold text-green-600">{dashboardStats.users.newThisMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Sold This Month:</span>
                <span className="font-semibold text-orange-600">{dashboardStats.equipment.soldThisMonth}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Equipment Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded">
              <p className="text-2xl font-bold text-primary">{dashboardStats.equipment.totalRobots}</p>
              <p className="text-sm text-muted-foreground">Total Robots</p>
            </div>
            <div className="text-center p-4 border rounded">
              <p className="text-2xl font-bold text-secondary">{dashboardStats.equipment.totalSpareParts}</p>
              <p className="text-sm text-muted-foreground">Spare Parts</p>
            </div>
            <div className="text-center p-4 border rounded">
              <p className="text-2xl font-bold text-accent">{dashboardStats.equipment.totalServices}</p>
              <p className="text-sm text-muted-foreground">Services</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;