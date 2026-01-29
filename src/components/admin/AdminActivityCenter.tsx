import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Eye, MessageSquare, Bell, Bot, Package, Settings, Truck, CreditCard,
  RefreshCw, Search, Download, Users, Activity, TrendingUp, Clock,
  MousePointer, FileText, Heart
} from "lucide-react";

interface ViewActivity {
  id: string;
  item_id: string;
  item_type: string;
  item_name: string;
  viewer_name: string;
  viewer_email?: string;
  seller_name?: string;
  seller_id?: string;
  view_count: number;
  created_at: string;
}

interface MessageActivity {
  id: string;
  sender_name: string;
  sender_email?: string;
  receiver_name?: string;
  item_name?: string;
  item_type: string;
  message_preview: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationActivity {
  id: string;
  user_id: string;
  user_name?: string;
  title: string;
  message: string;
  notification_type: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

const AdminActivityCenter = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("all");

  // Activity data
  const [viewActivities, setViewActivities] = useState<ViewActivity[]>([]);
  const [messageActivities, setMessageActivities] = useState<MessageActivity[]>([]);
  const [notificationActivities, setNotificationActivities] = useState<NotificationActivity[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalViews: 0,
    totalMessages: 0,
    totalNotifications: 0,
    todayViews: 0,
    todayMessages: 0,
    activeUsers: 0
  });

  const fetchAllActivities = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch view activities from button_interactions
      const { data: viewData, error: viewError } = await supabase
        .from("button_interactions")
        .select("*")
        .eq("button_type", "view")
        .order("created_at", { ascending: false })
        .limit(500);

      if (viewError) throw viewError;

      const processedViews: ViewActivity[] = (viewData || []).map(v => {
        const additionalData = v.additional_data as Record<string, any> | null;
        return {
          id: v.id,
          item_id: v.item_id || "",
          item_type: v.item_type || "unknown",
          item_name: additionalData?.item_details?.name || "Unknown Item",
          viewer_name: v.user_name || "Anonymous",
          viewer_email: v.user_email || undefined,
          seller_name: v.seller_name || undefined,
          seller_id: v.seller_id || undefined,
          view_count: additionalData?.view_count_after || 1,
          created_at: v.created_at
        };
      });
      setViewActivities(processedViews);

      // Fetch message activities
      const { data: messageData, error: messageError } = await supabase
        .from("chat_messages")
        .select(`
          id, message_content, sender_id, is_read, created_at,
          chat_sessions!inner(item_name, item_type, user1_id, user2_id)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (messageError) throw messageError;

      // Get sender profiles
      const senderIds = [...new Set((messageData || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const processedMessages: MessageActivity[] = (messageData || []).map(m => {
        const senderProfile = profileMap.get(m.sender_id);
        return {
          id: m.id,
          sender_name: senderProfile?.full_name || "Unknown User",
          sender_email: senderProfile?.email,
          item_name: (m.chat_sessions as any)?.item_name,
          item_type: (m.chat_sessions as any)?.item_type || "general",
          message_preview: m.message_content?.substring(0, 100) + (m.message_content?.length > 100 ? "..." : ""),
          created_at: m.created_at,
          is_read: m.is_read || false
        };
      });
      setMessageActivities(processedMessages);

      // Fetch notification activities
      const { data: notificationData, error: notificationError } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (notificationError) throw notificationError;

      // Get user profiles for notifications
      const userIds = [...new Set((notificationData || []).map(n => n.user_id))];
      const { data: userProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const userProfileMap = new Map((userProfiles || []).map(p => [p.user_id, p]));

      const processedNotifications: NotificationActivity[] = (notificationData || []).map(n => ({
        id: n.id,
        user_id: n.user_id,
        user_name: userProfileMap.get(n.user_id)?.full_name || "Unknown User",
        title: n.title,
        message: n.message,
        notification_type: n.notification_type,
        reference_type: n.reference_type,
        is_read: n.is_read || false,
        created_at: n.created_at
      }));
      setNotificationActivities(processedNotifications);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayViews = processedViews.filter(v => new Date(v.created_at) >= today).length;
      const todayMessages = processedMessages.filter(m => new Date(m.created_at) >= today).length;
      const uniqueViewers = new Set(processedViews.map(v => v.viewer_name)).size;

      setStats({
        totalViews: processedViews.length,
        totalMessages: processedMessages.length,
        totalNotifications: processedNotifications.length,
        todayViews,
        todayMessages,
        activeUsers: uniqueViewers
      });

    } catch (error: any) {
      console.error("Error fetching activities:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch activity data"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllActivities();
  }, [fetchAllActivities]);

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case "robots": return <Bot className="h-4 w-4 text-blue-500" />;
      case "spare_parts": return <Package className="h-4 w-4 text-orange-500" />;
      case "services": return <Settings className="h-4 w-4 text-purple-500" />;
      case "logistics_services": return <Truck className="h-4 w-4 text-green-500" />;
      case "loan_products": return <CreditCard className="h-4 w-4 text-yellow-500" />;
      default: return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getItemTypeBadgeColor = (type: string) => {
    switch (type) {
      case "robots": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "spare_parts": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "services": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "logistics_services": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "loan_products": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filterData = <T extends { created_at: string }>(data: T[], searchFields: (item: T) => string[]) => {
    let filtered = [...data];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        searchFields(item).some(field => field?.toLowerCase().includes(term))
      );
    }

    if (filterDate !== "all") {
      const now = new Date();
      let cutoff = new Date();
      switch (filterDate) {
        case "today": cutoff.setHours(0, 0, 0, 0); break;
        case "week": cutoff.setDate(now.getDate() - 7); break;
        case "month": cutoff.setMonth(now.getMonth() - 1); break;
      }
      filtered = filtered.filter(item => new Date(item.created_at) >= cutoff);
    }

    return filtered;
  };

  const filteredViews = filterData(viewActivities, v => [v.item_name, v.viewer_name, v.seller_name || "", v.item_type]);
  const filteredMessages = filterData(messageActivities, m => [m.sender_name, m.item_name || "", m.message_preview]);
  const filteredNotifications = filterData(notificationActivities, n => [n.user_name || "", n.title, n.message]);

  const exportToCSV = () => {
    const allData = [
      ...filteredViews.map(v => ({
        type: "View",
        date: format(new Date(v.created_at), "yyyy-MM-dd HH:mm"),
        user: v.viewer_name,
        item: v.item_name,
        itemType: v.item_type,
        seller: v.seller_name || ""
      })),
      ...filteredMessages.map(m => ({
        type: "Message",
        date: format(new Date(m.created_at), "yyyy-MM-dd HH:mm"),
        user: m.sender_name,
        item: m.item_name || "",
        itemType: m.item_type,
        seller: ""
      })),
      ...filteredNotifications.map(n => ({
        type: "Notification",
        date: format(new Date(n.created_at), "yyyy-MM-dd HH:mm"),
        user: n.user_name || "",
        item: n.title,
        itemType: n.notification_type,
        seller: ""
      }))
    ];

    const csv = [
      ["Type", "Date", "User", "Item", "Item Type", "Seller"].join(","),
      ...allData.map(d => [d.type, d.date, d.user, d.item, d.itemType, d.seller].map(f => `"${f}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Activity Center</h2>
          <p className="text-muted-foreground">Monitor all platform activities - views, messages, and notifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllActivities}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{stats.totalViews}</p>
              </div>
              <Eye className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today's Views</p>
                <p className="text-2xl font-bold text-green-600">{stats.todayViews}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Messages</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today's Msgs</p>
                <p className="text-2xl font-bold text-green-600">{stats.todayMessages}</p>
              </div>
              <Clock className="h-6 w-6 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Notifications</p>
                <p className="text-2xl font-bold">{stats.totalNotifications}</p>
              </div>
              <Bell className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="views" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Views ({filteredViews.length})
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages ({filteredMessages.length})
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications ({filteredNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {[
                    ...filteredViews.slice(0, 20).map(v => ({ type: "view" as const, data: v, time: v.created_at })),
                    ...filteredMessages.slice(0, 20).map(m => ({ type: "message" as const, data: m, time: m.created_at })),
                    ...filteredNotifications.slice(0, 20).map(n => ({ type: "notification" as const, data: n, time: n.created_at }))
                  ]
                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                    .slice(0, 50)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="p-2 rounded-full bg-muted">
                          {item.type === "view" && <Eye className="h-4 w-4 text-blue-500" />}
                          {item.type === "message" && <MessageSquare className="h-4 w-4 text-purple-500" />}
                          {item.type === "notification" && <Bell className="h-4 w-4 text-orange-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {item.type === "view" && (
                            <>
                              <p className="text-sm font-medium">
                                <span className="text-primary">{(item.data as ViewActivity).viewer_name}</span>
                                {" viewed "}
                                <span className="text-foreground">{(item.data as ViewActivity).item_name}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getItemTypeBadgeColor((item.data as ViewActivity).item_type)}>
                                  {(item.data as ViewActivity).item_type.replace("_", " ")}
                                </Badge>
                                {(item.data as ViewActivity).seller_name && (
                                  <span className="text-xs text-muted-foreground">
                                    Seller: {(item.data as ViewActivity).seller_name}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                          {item.type === "message" && (
                            <>
                              <p className="text-sm font-medium">
                                <span className="text-primary">{(item.data as MessageActivity).sender_name}</span>
                                {" sent a message"}
                                {(item.data as MessageActivity).item_name && (
                                  <> about <span className="text-foreground">{(item.data as MessageActivity).item_name}</span></>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {(item.data as MessageActivity).message_preview}
                              </p>
                            </>
                          )}
                          {item.type === "notification" && (
                            <>
                              <p className="text-sm font-medium">
                                <span className="text-primary">{(item.data as NotificationActivity).user_name}</span>
                                {" received: "}
                                <span className="text-foreground">{(item.data as NotificationActivity).title}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {(item.data as NotificationActivity).message}
                              </p>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(item.time), "MMM dd, HH:mm")}
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="views" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Item Views ({filteredViews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Viewer</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Views</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViews.slice(0, 100).map(view => (
                      <TableRow key={view.id}>
                        <TableCell>
                          <div className="text-sm">{format(new Date(view.created_at), "MMM dd, yyyy")}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(view.created_at), "HH:mm")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{view.viewer_name}</div>
                          {view.viewer_email && <div className="text-xs text-muted-foreground">{view.viewer_email}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{view.item_name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getItemTypeBadgeColor(view.item_type)}>
                            {view.item_type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{view.seller_name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{view.view_count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages ({filteredMessages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.slice(0, 100).map(msg => (
                      <TableRow key={msg.id}>
                        <TableCell>
                          <div className="text-sm">{format(new Date(msg.created_at), "MMM dd, yyyy")}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(msg.created_at), "HH:mm")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{msg.sender_name}</div>
                          {msg.sender_email && <div className="text-xs text-muted-foreground">{msg.sender_email}</div>}
                        </TableCell>
                        <TableCell>
                          <div>{msg.item_name || "-"}</div>
                          <Badge variant="outline" className="text-xs">{msg.item_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm">{msg.message_preview}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={msg.is_read ? "secondary" : "default"}>
                            {msg.is_read ? "Read" : "Unread"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications ({filteredNotifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.slice(0, 100).map(notif => (
                      <TableRow key={notif.id}>
                        <TableCell>
                          <div className="text-sm">{format(new Date(notif.created_at), "MMM dd, yyyy")}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(notif.created_at), "HH:mm")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{notif.user_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{notif.title}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm text-muted-foreground">{notif.message}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{notif.notification_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={notif.is_read ? "secondary" : "default"}>
                            {notif.is_read ? "Read" : "Unread"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminActivityCenter;
