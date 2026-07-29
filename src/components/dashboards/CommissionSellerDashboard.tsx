import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useViewTracking } from "@/hooks/useViewTracking";
import { 
  Plus, CheckCircle, Clock, Loader2,
  IndianRupee, Target, Handshake, FileText,
  Package, Users, BarChart3, Heart, Bot,
  Eye, TrendingUp, DollarSign, Search, RefreshCw,
  Download, Settings, Edit, Trash2, Ticket
} from "lucide-react";
import { format } from "date-fns";
import RobotUpload from "@/components/RobotUpload";
import { ViewAnalyticsDashboard } from "@/components/analytics/ViewAnalyticsDashboard";
import WatchlistSection from "@/components/WatchlistSection";
import CRMLeadsView from "@/components/crm/CRMLeadsView";
import QuoteRequestsSection from "@/components/dashboards/QuoteRequestsSection";
import CommissionDealsSection from "@/components/dashboards/CommissionDealsSection";
import SellerAssignedRequests from "@/components/SellerAssignedRequests";
import SentQuotationsTab from "@/components/crm/SentQuotationsTab";
import { FileQuestion } from "lucide-react";
import SellerCouponsSection from "@/components/coupons/SellerCouponsSection";

interface CommissionSellerDashboardProps {
  userProfile?: any;
}

const CommissionSellerDashboard = ({ userProfile }: CommissionSellerDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { viewStats, fetchUserItemViews, loading: viewsLoading } = useViewTracking();
  const [robots, setRobots] = useState<any[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRobot, setEditingRobot] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("inventory");

  const [dashboardStats, setDashboardStats] = useState({
    totalRobots: 0,
    activeListings: 0,
    totalRevenue: 0,
    totalViews: 0,
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchUserItemViews(user.id);
    }
  }, [user]);

  useEffect(() => {
    filterRobots();
  }, [robots, searchQuery, filterStatus]);

  const fetchDashboardData = async () => {
    if (!user) { setLoading(false); return; }
    try {
      setRefreshing(true);
      const { data } = await supabase
        .from("robots")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      const list = data || [];
      setRobots(list);
      setDashboardStats({
        totalRobots: list.length,
        activeListings: list.filter((r: any) => r.availability === "available").length,
        totalRevenue: list.reduce((s: number, r: any) => s + (r.price || 0), 0),
        totalViews: viewStats?.viewsByCategory?.robots ?? 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterRobots = () => {
    let filtered = [...robots];
    if (searchQuery) {
      filtered = filtered.filter((r: any) =>
        r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((r: any) => r.availability === filterStatus);
    }
    setFilteredRobots(filtered);
  };

  const handleDeleteRobot = async (robotId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    const { error } = await supabase.from("robots").delete().eq("id", robotId).eq("seller_id", user?.id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Deleted", description: "Listing removed" });
      fetchDashboardData();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statsCards = [
    { title: "Total Robots", value: dashboardStats.totalRobots, icon: Bot, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", sub: `${dashboardStats.activeListings} active` },
    { title: "Total Revenue", value: `₹${dashboardStats.totalRevenue.toLocaleString("en-IN")}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", sub: "Listing value" },
    { title: "Robot Views", value: viewStats?.viewsByCategory?.robots ?? 0, icon: Eye, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", sub: viewsLoading ? "Loading..." : "Total views" },
    { title: "Commission Model", value: "6%", icon: Handshake, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", sub: "On completed deals" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Commission Seller Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Unlimited listings • No credits required • 6% commission on completed deals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Robot
          </Button>
        </div>
      </div>

      {/* Commission info banner */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Handshake className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Commission Model Active:</strong> You have unlimited listings with no credit requirements. 
            Robotverse earns a 6% service fee only when a deal is marked as Won and verified by admin.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="border-muted/60 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-9 h-12">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Lead Manager
          </TabsTrigger>
          <TabsTrigger value="user-requests" className="flex items-center gap-2">
            <FileQuestion className="w-4 h-4" /> User Requests
          </TabsTrigger>
          <TabsTrigger value="quotations" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Quotations
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <Handshake className="w-4 h-4" /> Deals
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="watchlist" className="flex items-center gap-2">
            <Heart className="w-4 h-4" /> Watchlist
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Ticket className="w-4 h-4" /> Coupons
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" /> Robot Inventory ({filteredRobots.length})
                  </CardTitle>
                  <CardDescription>Unlimited listings — no subscription limits</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search robots..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRobots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No robots listed yet. Click "Add Robot" to create your first listing.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Robot</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRobots.map((robot: any) => (
                      <TableRow key={robot.id}>
                        <TableCell className="font-medium">{robot.name}</TableCell>
                        <TableCell>{robot.robot_type}</TableCell>
                        <TableCell>{robot.brand}</TableCell>
                        <TableCell className="text-right">₹{Number(robot.price || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant={robot.availability === "available" ? "default" : "secondary"}>
                            {robot.availability}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" title="View" onClick={() => window.open(`/robots/${robot.id}`, "_blank")}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Edit" onClick={() => setEditingRobot(robot)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" title="Delete" onClick={() => handleDeleteRobot(robot.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Manager Tab */}
        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Lead Manager
              </CardTitle>
              <CardDescription>
                All leads are accessible without credits. View product viewers, quote requests, and manage leads freely.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CRMLeadsView categoryFilter="robot" isCommissionSeller={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Requests Tab */}
        <TabsContent value="user-requests" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="w-5 h-5" /> Assigned User Requests
              </CardTitle>
              <CardDescription>
                User requests assigned to you by the admin. Submit quotations and solutions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SellerAssignedRequests categoryFilter="robot" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Sent Quotations
              </CardTitle>
              <CardDescription>
                Track all quotations you've sent to buyers with status and details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SentQuotationsTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-6">
          <CommissionDealsSection />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <ViewAnalyticsDashboard />
        </TabsContent>

        {/* Watchlist Tab */}
        <TabsContent value="watchlist" className="mt-6">
          <WatchlistSection />
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons" className="mt-6">
          <SellerCouponsSection />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Commission Account Settings</CardTitle>
              <CardDescription>Your account operates on the commission-based model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Account Type</span>
                  <Badge>Commission (6%)</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Listing Limit</span>
                  <span className="font-medium text-green-600">Unlimited</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Credits Required</span>
                  <span className="font-medium text-green-600">None</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subscription Fee</span>
                  <span className="font-medium text-green-600">None</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Robot Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Robot Listing</DialogTitle>
          </DialogHeader>
          <RobotUpload onSuccess={() => { setShowAddForm(false); fetchDashboardData(); }} />
        </DialogContent>
      </Dialog>

      {/* Edit Robot Dialog */}
      <Dialog open={!!editingRobot} onOpenChange={(open) => !open && setEditingRobot(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Robot Listing</DialogTitle>
          </DialogHeader>
          {editingRobot && (
            <RobotUpload
              editMode
              robotData={editingRobot}
              onSuccess={() => { setEditingRobot(null); fetchDashboardData(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommissionSellerDashboard;
