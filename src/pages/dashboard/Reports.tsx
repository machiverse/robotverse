import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, Filter, BarChart3, Users, Bot, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";

const Reports = () => {
  const { user } = useAuth();
  const { getSellerAnalytics } = useUniversalViewTracking();
  const [reportData, setReportData] = useState({
    totalListings: 0,
    totalViews: 0,
    totalRevenue: 0,
    robotsCount: 0,
    sparePartsCount: 0,
    servicesCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      generateReportData();
    }
  }, [user]);

  const generateReportData = async () => {
    if (!user) return;

    try {
      // Fetch real analytics data
      const analytics = await getSellerAnalytics(user.id);
      
      // Fetch listing counts
      const [robotsRes, sparePartsRes, servicesRes] = await Promise.all([
        supabase.from('robots').select('id, price').eq('seller_id', user.id),
        supabase.from('spare_parts').select('id, price').eq('seller_id', user.id),
        supabase.from('services').select('id').eq('provider_id', user.id)
      ]);

      const robots = robotsRes.data || [];
      const spareParts = sparePartsRes.data || [];
      const services = servicesRes.data || [];

      const totalRevenue = [
        ...robots.map(r => r.price || 0),
        ...spareParts.map(p => p.price || 0)
      ].reduce((sum, price) => sum + price, 0);

      // Calculate total views from analytics array
      const totalViews = analytics.reduce((sum, item) => sum + item.totalViews, 0);

      setReportData({
        totalListings: robots.length + spareParts.length + services.length,
        totalViews,
        totalRevenue,
        robotsCount: robots.length,
        sparePartsCount: spareParts.length,
        servicesCount: services.length
      });
    } catch (error) {
      console.error('Error generating report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCSVReport = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Listings', reportData.totalListings],
      ['Total Views', reportData.totalViews],
      ['Total Revenue (₹)', reportData.totalRevenue],
      ['Robots', reportData.robotsCount],
      ['Spare Parts', reportData.sparePartsCount],
      ['Services', reportData.servicesCount],
      ['Generated On', new Date().toLocaleDateString()]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reports = [
    {
      id: 1,
      title: "Business Analytics Report",
      description: "Comprehensive overview of your business performance",
      date: new Date().toISOString().split('T')[0],
      type: "Analytics",
      status: "Ready",
      data: reportData
    },
    {
      id: 2,
      title: "Listing Performance Report",
      description: "Views and engagement metrics for all your listings",
      date: new Date().toISOString().split('T')[0],
      type: "Performance",
      status: "Ready",
      data: reportData
    },
    {
      id: 3,
      title: "Revenue Summary Report",
      description: "Financial overview and revenue breakdown",
      date: new Date().toISOString().split('T')[0],
      type: "Financial",
      status: "Ready",
      data: reportData
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download comprehensive business reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalListings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{reportData.totalListings > 0 ? 
                Math.round(reportData.totalRevenue / reportData.totalListings).toLocaleString() : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Robot Analytics
            </CardTitle>
            <CardDescription>Analytics for your {reportData.robotsCount} robot listings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full" onClick={generateCSVReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parts Analytics
            </CardTitle>
            <CardDescription>Analytics for your {reportData.sparePartsCount} spare parts</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full" onClick={generateCSVReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Complete Report
            </CardTitle>
            <CardDescription>Full business performance summary</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full" onClick={generateCSVReport}>
              <Download className="h-4 w-4 mr-2" />
              Generate CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            Your latest generated reports and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">{report.title}</h4>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Generated: {new Date(report.date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Type: {report.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    report.status === 'Ready' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {report.status}
                  </span>
                  {report.status === 'Ready' && (
                    <Button variant="outline" size="sm" onClick={generateCSVReport}>
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;