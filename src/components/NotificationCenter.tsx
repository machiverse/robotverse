import React, { useState, useEffect, useCallback } from "react";
import { 
  Bell, 
  MessageSquare, 
  Bot, 
  Package, 
  Settings, 
  Truck, 
  CreditCard, 
  BookOpen,
  Heart,
  MessageCircle,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { playNotificationSound } from "@/utils/notificationSound";

interface UnreadConversation {
  session_id: string;
  conversation_partner_id: string;
  conversation_partner_name: string;
  conversation_partner_email: string;
  item_id: string;
  item_name: string;
  item_type: string;
  last_message_content: string;
  last_message_at: string;
  unread_count: number;
}

interface GeneralNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

const getNotificationLabel = (type: string): string => {
  switch (type) {
    case "robot_view": case "robots_view": return "Robot View";
    case "robot_inquiry": return "Robot Inquiry";
    case "robot_quote": return "Robot Quote";
    case "spare_part_view": case "spare_parts_view": return "Spare Part View";
    case "spare_part_inquiry": return "Parts Inquiry";
    case "spare_part_quote": return "Parts Quote";
    case "service_view": case "services_view": return "Service View";
    case "service_inquiry": return "Service Inquiry";
    case "service_quote": return "Service Quote";
    case "logistics_view": return "Logistics View";
    case "logistics_inquiry": return "Logistics Inquiry";
    case "logistics_quote": return "Logistics Quote";
    case "financing_view": return "Finance View";
    case "finance_inquiry": return "Finance Inquiry";
    case "finance_application": return "Finance Application";
    case "robobook_like": case "post_like": return "Like";
    case "robobook_comment": case "post_comment": return "Comment";
    case "product_view": return "Product View";
    case "quote_received": return "Quote Received";
    case "quote_request": return "Quote Request";
    case "quote_accepted": return "Quote Accepted";
    case "quote_rejected": return "Quote Rejected";
    case "quote_negotiation": return "Negotiation Request";
    case "lead_new": return "New Lead";
    case "lead_update": return "Lead Update";
    case "buyer_access_request": return "Access Request";
    case "buyer_access_approved": return "Access Approved";
    case "user_request": return "User Request";
    default: return "Notification";
  }
};

const getNotificationLabelColor = (type: string): string => {
  if (type.includes("robot")) return "bg-primary/10 text-primary";
  if (type.includes("spare") || type.includes("part")) return "bg-orange-500/10 text-orange-600";
  if (type.includes("service")) return "bg-primary/10 text-primary";
  if (type.includes("logistics")) return "bg-success/10 text-success";
  if (type.includes("financ")) return "bg-yellow-500/10 text-yellow-700";
  if (type.includes("like")) return "bg-red-500/10 text-red-600";
  if (type.includes("comment")) return "bg-primary/10 text-primary";
  if (type.includes("quote_accepted")) return "bg-success/10 text-success";
  if (type.includes("quote_rejected")) return "bg-red-500/10 text-red-600";
  if (type.includes("quote")) return "bg-primary/10 text-primary";
  if (type.includes("lead")) return "bg-success/10 text-success";
  return "bg-muted text-muted-foreground";
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "robot_view":
    case "robots_view":
    case "robot_inquiry":
    case "robot_quote":
      return <Bot className="h-4 w-4 text-primary" />;
    case "spare_part_view":
    case "spare_parts_view":
    case "spare_part_inquiry":
    case "spare_part_quote":
      return <Package className="h-4 w-4 text-orange-500" />;
    case "service_view":
    case "services_view":
    case "service_inquiry":
    case "service_quote":
      return <Settings className="h-4 w-4 text-primary" />;
    case "logistics_view":
    case "logistics_inquiry":
    case "logistics_quote":
      return <Truck className="h-4 w-4 text-success" />;
    case "financing_view":
    case "finance_inquiry":
    case "finance_application":
      return <CreditCard className="h-4 w-4 text-yellow-500" />;
    case "robobook_like":
    case "post_like":
      return <Heart className="h-4 w-4 text-red-500" />;
    case "robobook_comment":
    case "post_comment":
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case "product_view":
      return <Eye className="h-4 w-4 text-gray-500" />;
    case "quote_received":
    case "quote_request":
      return <FileText className="h-4 w-4 text-primary" />;
    case "quote_accepted":
      return <CheckCircle className="h-4 w-4 text-success" />;
    case "quote_rejected":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "quote_negotiation":
      return <MessageSquare className="h-4 w-4 text-amber-500" />;
    case "lead_new":
    case "lead_update":
      return <Users className="h-4 w-4 text-success" />;
    case "buyer_access_request":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "buyer_access_approved":
      return <CheckCircle className="h-4 w-4 text-success" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

export const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadConversations, setUnreadConversations] = useState<UnreadConversation[]>([]);
  const [generalNotifications, setGeneralNotifications] = useState<GeneralNotification[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [unreadGeneralCount, setUnreadGeneralCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");

  const fetchUnreadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_unread_conversations", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching unread conversations:", error);
        return;
      }

      const uniqueConversations = Array.from(
        new Map((data || []).map((conv: UnreadConversation) => [conv.session_id, conv])).values(),
      );

      setUnreadConversations(uniqueConversations);

      const total = uniqueConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      return total;
    } catch (error) {
      console.error("Error fetching unread conversations:", error);
      return 0;
    }
  }, [user]);

  const fetchGeneralNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setGeneralNotifications(data || []);
      const unreadCount = (data || []).filter(n => !n.is_read).length;
      setUnreadGeneralCount(unreadCount);
      return unreadCount;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return 0;
    }
  }, [user]);

  const fetchAllNotifications = useCallback(async () => {
    const [chatCount, generalCount] = await Promise.all([
      fetchUnreadConversations(),
      fetchGeneralNotifications()
    ]);
    setTotalUnreadCount((chatCount || 0) + (generalCount || 0));
  }, [fetchUnreadConversations, fetchGeneralNotifications]);

  useEffect(() => {
    if (!user) return;

    fetchAllNotifications();

    let messageDebounceTimer: NodeJS.Timeout;
    let readDebounceTimer: NodeJS.Timeout;

    // Subscribe to new chat messages
    const messagesChannel = supabase
      .channel(`user-messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;
          const messageId = newMessage.id;

          if (processedMessageIds.has(messageId)) {
            return;
          }

          if (newMessage.sender_id !== user.id) {
            try {
              const { data: session, error: sessionError } = await supabase
                .from("chat_sessions")
                .select("user1_id, user2_id")
                .eq("id", newMessage.chat_session_id)
                .single();

              if (sessionError) {
                console.error("Error fetching session:", sessionError);
                return;
              }

              if (session && (session.user1_id === user.id || session.user2_id === user.id)) {
                setProcessedMessageIds((prev) => new Set(prev).add(messageId));
                playNotificationSound();

                clearTimeout(messageDebounceTimer);
                messageDebounceTimer = setTimeout(() => {
                  fetchAllNotifications();
                }, 300);
              }
            } catch (error) {
              console.error("Error processing new message:", error);
            }
          }
        },
      )
      .subscribe();

    // Subscribe to messages being marked as read
    const readChannel = supabase
      .channel(`user-read-messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `is_read=eq.true`,
        },
        () => {
          clearTimeout(readDebounceTimer);
          readDebounceTimer = setTimeout(() => {
            fetchAllNotifications();
          }, 300);
        },
      )
      .subscribe();

    // Subscribe to new general notifications
    const notificationsChannel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          playNotificationSound();
          fetchAllNotifications();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAllNotifications();
        },
      )
      .subscribe();

    return () => {
      clearTimeout(messageDebounceTimer);
      clearTimeout(readDebounceTimer);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, processedMessageIds, fetchAllNotifications]);

  const handleChatNotificationClick = async (conversation: UnreadConversation) => {
    try {
      const { error: updateError } = await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("chat_session_id", conversation.session_id)
        .neq("sender_id", user?.id)
        .eq("is_read", false);

      if (updateError) {
        console.error("Error marking messages as read:", updateError);
      }

      setUnreadConversations((prev) => prev.filter((conv) => conv.session_id !== conversation.session_id));
      setTotalUnreadCount((prev) => Math.max(0, prev - conversation.unread_count));
      setOpen(false);

      const queryParams = new URLSearchParams({
        other_user: conversation.conversation_partner_id,
        item: conversation.item_id || "",
        type: conversation.item_type,
        name: conversation.item_name || "Chat",
      });

      navigate(`/chat?${queryParams.toString()}`);

      setTimeout(() => {
        fetchAllNotifications();
      }, 500);
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  const handleGeneralNotificationClick = async (notification: GeneralNotification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notification.id);

        setGeneralNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadGeneralCount((prev) => Math.max(0, prev - 1));
        setTotalUnreadCount((prev) => Math.max(0, prev - 1));
      }

      setOpen(false);

      // Navigate based on notification type and reference
      // Add timestamp to force re-render when navigating to the same CRM route
      const navType = notification.reference_type || notification.notification_type;
      const refId = notification.reference_id;
      const ts = Date.now();

      if (refId) {
        switch (navType) {
          case "robot":
          case "robot_view":
            navigate(`/robots/${refId}`);
            break;
          case "robot_inquiry":
          case "robot_quote":
            navigate(`/crm?view=leads&tab=quotes&t=${ts}`);
            break;
          case "spare_part":
          case "spare_part_view":
            navigate(`/parts/${refId}`);
            break;
          case "spare_part_inquiry":
          case "spare_part_quote":
            navigate(`/crm?view=leads&tab=quotes&t=${ts}`);
            break;
          case "service":
          case "service_view":
            navigate(`/services/${refId}`);
            break;
          case "service_inquiry":
          case "service_quote":
            navigate(`/crm?view=leads&tab=quotes&t=${ts}`);
            break;
          case "logistics":
          case "logistics_view":
            navigate(`/logistics/${refId}`);
            break;
          case "logistics_inquiry":
          case "logistics_quote":
            navigate(`/crm?view=leads&tab=quotes&t=${ts}`);
            break;
          case "financing":
          case "financing_view":
            navigate(`/financing/${refId}`);
            break;
          case "finance_inquiry":
          case "finance_application":
            navigate(`/crm?view=leads&tab=quotes&t=${ts}`);
            break;
          case "community_post":
          case "robobook":
          case "robobook_like":
          case "robobook_comment":
          case "post_like":
          case "post_comment":
            navigate(`/robobook/${refId}`);
            break;
          case "lead":
          case "lead_new":
          case "lead_update":
            navigate(`/crm?view=leads&tab=leads&t=${ts}`);
            break;
          case "buyer_access_request":
          case "buyer_access_approved":
            navigate(`/dashboard`);
            break;
          case "quotation":
          case "quote_received":
            navigate(`/dashboard/quotations`);
            break;
          case "quote_request":
            navigate(`/crm?view=leads&tab=quotes&t=${ts}`);
            break;
          case "quote_accepted":
          case "quote_rejected":
          case "quote_negotiation":
            navigate(`/crm?view=leads&tab=sent_quotes&t=${ts}`);
            break;
          case "user_request":
            navigate(`/crm?view=leads&tab=user_requests&t=${ts}`);
            break;
          default:
            navigate(`/dashboard`);
        }
      } else {
        switch (notification.notification_type) {
          case "quote_request":
            navigate(`/crm?view=leads&tab=quotes&t=${ts}`);
            break;
          case "quote_received":
            navigate("/dashboard/quotations");
            break;
          case "quote_accepted":
          case "quote_rejected":
          case "quote_negotiation":
            navigate(`/crm?view=leads&tab=sent_quotes&t=${ts}`);
            break;
          case "lead_new":
          case "lead_update":
            navigate(`/crm?view=leads&tab=leads&t=${ts}`);
            break;
          case "user_request":
            navigate(`/crm?view=leads&tab=user_requests&t=${ts}`);
            break;
          case "buyer_access_request":
          case "buyer_access_approved":
            navigate("/dashboard");
            break;
          case "robot_view":
          case "robots_view":
          case "spare_part_view":
          case "spare_parts_view":
          case "service_view":
          case "services_view":
          case "product_view":
            navigate(`/crm?view=leads&tab=views&t=${ts}`);
            break;
          default:
            navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setGeneralNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadGeneralCount(0);
      setTotalUnreadCount(unreadConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  if (!user) return null;

  const chatUnreadCount = unreadConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">Notifications</h3>
            {unreadGeneralCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-primary hover:text-primary"
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 p-1 m-2 mr-4">
            <TabsTrigger value="all" className="text-xs relative">
              All
              {totalUnreadCount > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  {totalUnreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs relative">
              Messages
              {chatUnreadCount > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  {chatUnreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs relative">
              Activity
              {unreadGeneralCount > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  {unreadGeneralCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px]">
            <TabsContent value="all" className="m-0">
              {unreadConversations.length === 0 && generalNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {/* Show unread chats first */}
                  {unreadConversations.map((conversation) => (
                    <div
                      key={conversation.session_id}
                      onClick={() => handleChatNotificationClick(conversation)}
                      className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">
                              {conversation.conversation_partner_name || conversation.conversation_partner_email}
                            </p>
                            {conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="ml-2 flex-shrink-0 text-xs">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">{conversation.item_name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{conversation.last_message_content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {conversation.last_message_at
                              ? format(new Date(conversation.last_message_at), "MMM dd, HH:mm")
                              : "Just now"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Then show general notifications */}
                  {generalNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleGeneralNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-accent transition-colors group ${
                        !notification.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm truncate ${!notification.is_read ? "font-semibold" : "font-medium"}`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-primary ml-2 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getNotificationLabelColor(notification.notification_type)}`}>
                                {getNotificationLabel(notification.notification_type)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(notification.created_at), "MMM dd, HH:mm")}
                              </span>
                            </div>
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                              View →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="m-0">
              {unreadConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No unread messages</p>
                </div>
              ) : (
                <div className="divide-y">
                  {unreadConversations.map((conversation) => (
                    <div
                      key={conversation.session_id}
                      onClick={() => handleChatNotificationClick(conversation)}
                      className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">
                              {conversation.conversation_partner_name || conversation.conversation_partner_email}
                            </p>
                            {conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="ml-2 flex-shrink-0 text-xs">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">{conversation.item_name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{conversation.last_message_content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {conversation.last_message_at
                              ? format(new Date(conversation.last_message_at), "MMM dd, HH:mm")
                              : "Just now"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="m-0">
              {generalNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {generalNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleGeneralNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-accent transition-colors group ${
                        !notification.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm truncate ${!notification.is_read ? "font-semibold" : "font-medium"}`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-primary ml-2 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getNotificationLabelColor(notification.notification_type)}`}>
                                {getNotificationLabel(notification.notification_type)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(notification.created_at), "MMM dd, HH:mm")}
                              </span>
                            </div>
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                              View →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
