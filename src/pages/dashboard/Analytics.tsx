import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, DollarSign, Bot, Package, Wrench, Truck, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";

const Analytics = () => {
  const { user } = useAuth();
  const { getSellerAnalytics } = useUniversalViewTracking();
  const [analytics, setAnalytics] = useState({
    totalListings: 0,
    totalViews: 0,
    totalRevenue: 0,
    activeListings: 0,
    robotsCount: 0,
    sparePartsCount: 0,
    servicesCount: 0,
    logisticsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Fetch seller analytics data
      const sellerAnalytics = await getSellerAnalytics(user.id);
      
      // Fetch user's listings count
      const [robotsData, sparePartsData, servicesData, logisticsData] = await Promise.all([
        supabase.from('robots').select('id, price').eq('seller_id', user.id),
        supabase.from('spare_parts').select('id, price').eq('seller_id', user.id),
        supabase.from('services').select('id').eq('provider_id', user.id),
        supabase.from('logistics_services').select('id').eq('provider_id', user.id)
      ]);

      const robots = robotsData.data || [];
      const spareParts = sparePartsData.data || [];
      const services = servicesData.data || [];
      const logistics = logisticsData.data || [];

      const totalRevenue = [
        ...robots.map(r => r.price || 0),
        ...spareParts.map(p => p.price || 0)
      ].reduce((sum, price) => sum + price, 0);

      const totalListings = robots.length + spareParts.length + services.length + logistics.length;
      const activeListings = robots.filter(r => r.price > 0).length + spareParts.filter(p => p.price > 0).length;

      // Calculate total views from analytics array
      const totalViews = sellerAnalytics.reduce((sum, item) => sum + item.totalViews, 0);

      setAnalytics({
        totalListings,
        totalViews,
        totalRevenue,
        activeListings,
        robotsCount: robots.length,
        sparePartsCount: spareParts.length,
        servicesCount: services.length,
        logisticsCount: logistics.length
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your performance metrics and insights
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From all your listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Views
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Across all your products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Listings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalListings}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeListings} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Price
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{analytics.totalListings > 0 ? (analytics.totalRevenue / analytics.totalListings).toLocaleString() : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per listing average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Robots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.robotsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spare Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.sparePartsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.servicesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logistics</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.logisticsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and detailed analytics would go here */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>
              Your key metrics over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Chart visualization will be implemented here
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <CardDescription>
              Best selling items this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Product performance data will be displayed here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;