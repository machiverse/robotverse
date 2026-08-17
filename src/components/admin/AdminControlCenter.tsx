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
  MousePointer, FileText, Heart, LogIn, UserPlus, Edit, Trash2,
  ShoppingCart, Send, Share2, ThumbsUp, Star, AlertTriangle, CheckCircle,
  XCircle, Globe, Smartphone
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  user_name: string;
  user_email?: string;
  item_name?: string;
  item_type?: string;
  details?: string;
  created_at: string;
  status?: string;
  metadata?: any;
}

const AdminControlCenter = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("realtime");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("today");

  // All activities
  const [allActivities, setAllActivities] = useState<ActivityItem[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalViews: 0,
    totalMessages: 0,
    totalNotifications: 0,
    totalButtonClicks: 0,
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalUsers: 0,
    activeToday: 0,
    newUsersToday: 0,
    robotsViewed: 0,
    partsViewed: 0,
    servicesViewed: 0,
    inquiriesSent: 0,
    chatsStarted: 0,
    quotesRequested: 0
  });

  const fetchAllSiteActivities = useCallback(async () => {
    try {
      setLoading(true);
      const activities: ActivityItem[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Fetch Button Interactions (all user clicks)
      const { data: buttonData } = await supabase
        .from("button_interactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      (buttonData || []).forEach(b => {
        const additionalData = b.additional_data as Record<string, any> | null;
        activities.push({
          id: `btn-${b.id}`,
          type: "button_click",
          action: b.button_name || b.button_type,
          user_name: b.user_name || "Anonymous",
          user_email: b.user_email || undefined,
          item_name: additionalData?.item_details?.name || b.item_id,
          item_type: b.item_type,
          details: `${b.button_type} on ${b.item_type || 'page'}`,
          created_at: b.created_at,
          metadata: { seller_name: b.seller_name, page_url: b.page_url }
        });
      });

      // 2. Fetch Chat Messages
      const { data: messageData } = await supabase
        .from("chat_messages")
        .select(`
          id, message_content, sender_id, is_read, created_at,
          chat_sessions!inner(item_name, item_type, user1_id, user2_id)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      const senderIds = [...new Set((messageData || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", senderIds.length > 0 ? senderIds : ['']);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      (messageData || []).forEach(m => {
        const senderProfile = profileMap.get(m.sender_id);
        activities.push({
          id: `msg-${m.id}`,
          type: "message",
          action: "Sent Message",
          user_name: senderProfile?.full_name || "Unknown User",
          user_email: senderProfile?.email,
          item_name: (m.chat_sessions as any)?.item_name,
          item_type: (m.chat_sessions as any)?.item_type,
          details: m.message_content?.substring(0, 80) + (m.message_content?.length > 80 ? "..." : ""),
          created_at: m.created_at || new Date().toISOString(),
          status: m.is_read ? "read" : "unread"
        });
      });

      // 3. Fetch Notifications
      const { data: notificationData } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      const notifUserIds = [...new Set((notificationData || []).map(n => n.user_id))];
      const { data: notifProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", notifUserIds.length > 0 ? notifUserIds : ['']);

      const notifProfileMap = new Map((notifProfiles || []).map(p => [p.user_id, p]));

      (notificationData || []).forEach(n => {
        activities.push({
          id: `notif-${n.id}`,
          type: "notification",
          action: n.notification_type,
          user_name: notifProfileMap.get(n.user_id)?.full_name || "Unknown",
          user_email: notifProfileMap.get(n.user_id)?.email,
          item_name: n.title,
          details: n.message,
          created_at: n.created_at || new Date().toISOString(),
          status: n.is_read ? "read" : "unread"
        });
      });

      // 4. Fetch Community Posts
      const { data: postsData } = await supabase
        .from("community_posts")
        .select("id, title, content, author_id, post_type, like_count, comment_count, view_count, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      const postAuthorIds = [...new Set((postsData || []).map(p => p.author_id))];
      const { data: postProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", postAuthorIds.length > 0 ? postAuthorIds : ['']);

      const postProfileMap = new Map((postProfiles || []).map(p => [p.user_id, p]));

      (postsData || []).forEach(p => {
        activities.push({
          id: `post-${p.id}`,
          type: "post",
          action: "Created Post",
          user_name: postProfileMap.get(p.author_id)?.full_name || "Unknown",
          user_email: postProfileMap.get(p.author_id)?.email,
          item_name: p.title || p.content?.substring(0, 50),
          item_type: p.post_type,
          details: `${p.like_count || 0} likes, ${p.comment_count || 0} comments, ${p.view_count || 0} views`,
          created_at: p.created_at
        });
      });

      // 5. Fetch Blog Posts
      const { data: blogsData } = await supabase
        .from("blogs")
        .select("id, title, author_id, like_count, view_count, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      const blogAuthorIds = [...new Set((blogsData || []).map(b => b.author_id))];
      const { data: blogProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", blogAuthorIds.length > 0 ? blogAuthorIds : ['']);

      const blogProfileMap = new Map((blogProfiles || []).map(p => [p.user_id, p]));

      (blogsData || []).forEach(b => {
        activities.push({
          id: `blog-${b.id}`,
          type: "blog",
          action: "Published Blog",
          user_name: blogProfileMap.get(b.author_id)?.full_name || "Unknown",
          user_email: blogProfileMap.get(b.author_id)?.email,
          item_name: b.title,
          details: `${b.like_count || 0} likes, ${b.view_count || 0} views`,
          created_at: b.created_at
        });
      });

      // 6. Fetch Content Interactions (Likes, Comments, Shares)
      const { data: interactionsData } = await supabase
        .from("content_interactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      const interactionUserIds = [...new Set((interactionsData || []).map(i => i.user_id))];
      const { data: interactionProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", interactionUserIds.length > 0 ? interactionUserIds : ['']);

      const interactionProfileMap = new Map((interactionProfiles || []).map(p => [p.user_id, p]));

      (interactionsData || []).forEach(i => {
        activities.push({
          id: `interaction-${i.id}`,
          type: i.interaction_type,
          action: i.interaction_type === "like" ? "Liked" : i.interaction_type === "comment" ? "Commented" : i.interaction_type,
          user_name: interactionProfileMap.get(i.user_id)?.full_name || "Unknown",
          user_email: interactionProfileMap.get(i.user_id)?.email,
          item_type: i.content_type,
          details: i.comment_text || `${i.interaction_type} on ${i.content_type}`,
          created_at: i.created_at
        });
      });

      // 7. Fetch Chat Sessions (new chats started)
      const { data: chatSessionsData } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      (chatSessionsData || []).forEach(c => {
        activities.push({
          id: `chat-${c.id}`,
          type: "chat_started",
          action: "Started Chat",
          user_name: "User",
          item_name: c.item_name,
          item_type: c.item_type,
          details: `Chat about ${c.item_type}`,
          created_at: c.created_at || new Date().toISOString(),
          status: c.status
        });
      });

      // 8. Fetch Buyer Access Requests
      const { data: accessRequestsData } = await supabase
        .from("buyer_access_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      (accessRequestsData || []).forEach(a => {
        activities.push({
          id: `access-${a.id}`,
          type: "access_request",
          action: "Requested Buyer Access",
          user_name: "Buyer",
          item_name: a.item_name,
          item_type: a.inquiry_type,
          details: `Status: ${a.status}`,
          created_at: a.created_at,
          status: a.status
        });
      });

      // 9. Fetch Item View Counts
      const { data: viewCountsData } = await supabase
        .from("item_view_counts")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);

      // 10. Fetch All Profiles for user stats
      const { data: allProfiles, count: totalUsersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact" });

      // Sort all activities by date
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllActivities(activities);

      // Calculate comprehensive stats
      const todayActivities = activities.filter(a => new Date(a.created_at) >= today);
      const buttonClicks = (buttonData || []);
      const robotViews = buttonClicks.filter(b => b.item_type === "robots" && b.button_type === "view").length;
      const partsViews = buttonClicks.filter(b => b.item_type === "spare_parts" && b.button_type === "view").length;
      const servicesViews = buttonClicks.filter(b => b.item_type === "services" && b.button_type === "view").length;

      const newUsersToday = (allProfiles || []).filter(p => 
        p.created_at && new Date(p.created_at) >= today
      ).length;

      setStats({
        totalViews: (viewCountsData || []).reduce((sum, v) => sum + (v.total_views || 0), 0),
        totalMessages: (messageData || []).length,
        totalNotifications: (notificationData || []).length,
        totalButtonClicks: buttonClicks.length,
        totalPosts: (postsData || []).length + (blogsData || []).length,
        totalLikes: (interactionsData || []).filter(i => i.interaction_type === "like").length,
        totalComments: (interactionsData || []).filter(i => i.interaction_type === "comment").length,
        totalUsers: totalUsersCount || 0,
        activeToday: todayActivities.length,
        newUsersToday,
        robotsViewed: robotViews,
        partsViewed: partsViews,
        servicesViewed: servicesViews,
        inquiriesSent: buttonClicks.filter(b => b.button_type === "inquiry" || b.button_name?.includes("inquiry")).length,
        chatsStarted: (chatSessionsData || []).length,
        quotesRequested: buttonClicks.filter(b => b.button_name?.includes("quote") || b.button_type === "quote").length
      });

    } catch (error: any) {
      console.error("Error fetching site activities:", error);
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
    fetchAllSiteActivities();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllSiteActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchAllSiteActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "button_click": return <MousePointer className="h-4 w-4 text-primary" />;
      case "message": return <MessageSquare className="h-4 w-4 text-primary" />;
      case "notification": return <Bell className="h-4 w-4 text-orange-500" />;
      case "post": return <FileText className="h-4 w-4 text-success" />;
      case "blog": return <FileText className="h-4 w-4 text-success" />;
      case "like": return <Heart className="h-4 w-4 text-red-500" />;
      case "comment": return <MessageSquare className="h-4 w-4 text-primary" />;
      case "chat_started": return <Send className="h-4 w-4 text-primary" />;
      case "access_request": return <UserPlus className="h-4 w-4 text-yellow-500" />;
      case "view": return <Eye className="h-4 w-4 text-muted-foreground" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case "button_click": return "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary";
      case "message": return "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary";
      case "notification": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "post": case "blog": return "bg-success/10 text-success dark:bg-success/30 dark:text-success";
      case "like": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "comment": return "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary";
      case "chat_started": return "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary";
      case "access_request": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case "robots": return <Bot className="h-3 w-3" />;
      case "spare_parts": return <Package className="h-3 w-3" />;
      case "services": return <Settings className="h-3 w-3" />;
      case "logistics_services": return <Truck className="h-3 w-3" />;
      case "loan_products": return <CreditCard className="h-3 w-3" />;
      default: return null;
    }
  };

  const filterActivities = (activities: ActivityItem[]) => {
    let filtered = [...activities];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.user_name?.toLowerCase().includes(term) ||
        a.user_email?.toLowerCase().includes(term) ||
        a.item_name?.toLowerCase().includes(term) ||
        a.action?.toLowerCase().includes(term) ||
        a.details?.toLowerCase().includes(term)
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(a => a.type === filterType);
    }

    if (filterDate !== "all") {
      const now = new Date();
      let cutoff = new Date();
      switch (filterDate) {
        case "today": cutoff.setHours(0, 0, 0, 0); break;
        case "hour": cutoff.setHours(now.getHours() - 1); break;
        case "week": cutoff.setDate(now.getDate() - 7); break;
        case "month": cutoff.setMonth(now.getMonth() - 1); break;
      }
      filtered = filtered.filter(a => new Date(a.created_at) >= cutoff);
    }

    return filtered;
  };

  const filteredActivities = filterActivities(allActivities);

  const exportToCSV = () => {
    const csv = [
      ["Type", "Action", "User", "Email", "Item", "Item Type", "Details", "Date"].join(","),
      ...filteredActivities.map(a => [
        a.type, a.action, a.user_name, a.user_email || "", a.item_name || "", a.item_type || "", 
        (a.details || "").replace(/,/g, ";"), format(new Date(a.created_at), "yyyy-MM-dd HH:mm:ss")
      ].map(f => `"${f}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-control-center-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array(8).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3">
                <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                <div className="h-6 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Admin Control Center
          </h2>
          <p className="text-muted-foreground">Complete site-wide monitoring - every action, every user, real-time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllSiteActivities}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid - 2 Rows of 8 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-primary/5 border-primary/30 dark:border-primary/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Views</p>
                <p className="text-xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/30 dark:border-success/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Today</p>
                <p className="text-xl font-bold text-success">{stats.activeToday}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/30 dark:border-primary/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Messages</p>
                <p className="text-xl font-bold">{stats.totalMessages}</p>
              </div>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Notifications</p>
                <p className="text-xl font-bold">{stats.totalNotifications}</p>
              </div>
              <Bell className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/30 dark:border-primary/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Button Clicks</p>
                <p className="text-xl font-bold">{stats.totalButtonClicks}</p>
              </div>
              <MousePointer className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/5 border-red-200 dark:border-red-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Likes</p>
                <p className="text-xl font-bold">{stats.totalLikes}</p>
              </div>
              <Heart className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/30 dark:border-primary/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Comments</p>
                <p className="text-xl font-bold">{stats.totalComments}</p>
              </div>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/30 border-pink-200 dark:border-pink-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Users</p>
                <p className="text-xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-5 w-5 text-pink-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row of Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Robots Viewed</p>
                <p className="text-lg font-bold">{stats.robotsViewed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Parts Viewed</p>
                <p className="text-lg font-bold">{stats.partsViewed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Services Viewed</p>
                <p className="text-lg font-bold">{stats.servicesViewed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-success" />
              <div>
                <p className="text-[10px] text-muted-foreground">Chats Started</p>
                <p className="text-lg font-bold">{stats.chatsStarted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-success" />
              <div>
                <p className="text-[10px] text-muted-foreground">Inquiries</p>
                <p className="text-lg font-bold">{stats.inquiriesSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">New Users Today</p>
                <p className="text-lg font-bold text-success">{stats.newUsersToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, item, action..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Activity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="button_click">Button Clicks</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="notification">Notifications</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="blog">Blogs</SelectItem>
                <SelectItem value="like">Likes</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
                <SelectItem value="chat_started">Chats</SelectItem>
                <SelectItem value="access_request">Access Requests</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Last Hour</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Activity Feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Real-time Activity Feed
            <Badge variant="secondary" className="ml-2">{filteredActivities.length} activities</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-32">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.slice(0, 200).map((activity) => (
                  <TableRow key={activity.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center">
                        {getActivityIcon(activity.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getActivityBadgeColor(activity.type)} text-xs`}>
                        {activity.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{activity.user_name}</p>
                        {activity.user_email && (
                          <p className="text-xs text-muted-foreground">{activity.user_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {activity.item_name && (
                        <div className="flex items-center gap-1">
                          {activity.item_type && getItemTypeIcon(activity.item_type)}
                          <span className="text-sm truncate max-w-32">{activity.item_name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground truncate max-w-48">
                        {activity.details}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(activity.created_at), "MMM d, HH:mm")}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminControlCenter;
