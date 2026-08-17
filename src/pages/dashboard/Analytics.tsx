import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  DollarSign, 
  Bot, 
  Package, 
  Wrench, 
  Truck, 
  Eye,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
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
      const sellerAnalytics = await getSellerAnalytics(user.id);
      
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

  const totalCategoryItems = analytics.robotsCount + analytics.sparePartsCount + analytics.servicesCount + analytics.logisticsCount;
  const getPercentage = (count: number) => totalCategoryItems > 0 ? (count / totalCategoryItems) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Activity className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Track your performance metrics and business insights
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics - Gradient Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="relative overflow-hidden border-0 bg-success text-primary-foreground shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Total Revenue
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-card/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{analytics.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight className="h-4 w-4 text-success" />
              <span className="text-sm text-success">From all listings</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Views */}
        <Card className="relative overflow-hidden border-0 bg-primary text-primary-foreground shadow-lg shadow-blue-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Total Views
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-card/20 flex items-center justify-center">
              <Eye className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalViews.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">Across all products</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Listings */}
        <Card className="relative overflow-hidden border-0 bg-primary text-primary-foreground shadow-lg shadow-violet-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">
              Total Listings
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-card/20 flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalListings}</div>
            <div className="flex items-center gap-1 mt-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">{analytics.activeListings} active</span>
            </div>
          </CardContent>
        </Card>

        {/* Avg. Price */}
        <Card className="relative overflow-hidden border-0 bg-warning text-primary-foreground shadow-lg shadow-amber-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-100">
              Avg. Price
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-card/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{analytics.totalListings > 0 ? Math.round(analytics.totalRevenue / analytics.totalListings).toLocaleString() : 0}
            </div>
            <div className="flex items-center gap-1 mt-2">
              <BarChart3 className="h-4 w-4 text-amber-200" />
              <span className="text-sm text-amber-100">Per listing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown with Progress */}
      <Card className="border-muted/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Category Distribution</CardTitle>
              <CardDescription>Breakdown of your listings by category</CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalCategoryItems} Total Items
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Robots */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Robots</p>
                    <p className="text-xs text-muted-foreground">Industrial automation</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary">{analytics.robotsCount}</span>
              </div>
              <Progress value={getPercentage(analytics.robotsCount)} className="h-2 bg-primary/10" />
            </div>

            {/* Spare Parts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-warning flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Package className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Spare Parts</p>
                    <p className="text-xs text-muted-foreground">Components & parts</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-orange-600">{analytics.sparePartsCount}</span>
              </div>
              <Progress value={getPercentage(analytics.sparePartsCount)} className="h-2 bg-orange-100" />
            </div>

            {/* Services */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-success flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Wrench className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Services</p>
                    <p className="text-xs text-muted-foreground">Maintenance & repair</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-success">{analytics.servicesCount}</span>
              </div>
              <Progress value={getPercentage(analytics.servicesCount)} className="h-2 bg-success/10" />
            </div>

            {/* Logistics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Truck className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Logistics</p>
                    <p className="text-xs text-muted-foreground">Shipping & delivery</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary">{analytics.logisticsCount}</span>
              </div>
              <Progress value={getPercentage(analytics.logisticsCount)} className="h-2 bg-primary/10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance & Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-muted/60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Your key metrics over the last 30 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-primary" />
                  <span className="font-medium">Views this month</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-primary">{analytics.totalViews}</span>
                  <Badge className="bg-success/10 text-success border-0">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-success/5">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-success" />
                  <span className="font-medium">Active listings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-success">{analytics.activeListings}</span>
                  <Badge className="bg-success/10 text-success border-0">
                    of {analytics.totalListings}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-warning/5">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">Revenue potential</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-amber-600">₹{analytics.totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Quick Insights</CardTitle>
                <CardDescription>Key takeaways from your performance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.robotsCount > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/10 dark:border-primary/30 dark:bg-primary/20">
                  <Bot className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-primary dark:text-primary">Robot Listings</p>
                    <p className="text-sm text-primary dark:text-primary">
                      You have {analytics.robotsCount} robot{analytics.robotsCount > 1 ? 's' : ''} listed
                    </p>
                  </div>
                </div>
              )}

              {analytics.sparePartsCount > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                  <Package className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900 dark:text-orange-100">Parts Catalog</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      {analytics.sparePartsCount} spare part{analytics.sparePartsCount > 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>
              )}

              {analytics.servicesCount > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-success/30 bg-success/10 dark:border-success/30 dark:bg-success/20">
                  <Wrench className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium text-success dark:text-success">Service Offerings</p>
                    <p className="text-sm text-success dark:text-success">
                      {analytics.servicesCount} service{analytics.servicesCount > 1 ? 's' : ''} active
                    </p>
                  </div>
                </div>
              )}

              {analytics.totalListings === 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-muted bg-muted/20">
                  <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">No listings yet</p>
                    <p className="text-sm text-muted-foreground">
                      Start adding robots, parts, or services to see insights
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
