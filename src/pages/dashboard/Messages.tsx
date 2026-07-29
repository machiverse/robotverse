import React, { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { MessageCircle, Search, Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  item_id: string;
  item_type: string;
  item_name: string;
  status: string;
  last_message_at: string;
  created_at: string;
  other_party_name?: string;
  other_party_company?: string;
  last_message?: string;
  unread_count?: number;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setUserProfile(data);
    };

    fetchProfile();
  }, [user]);

  // Fetch all conversations
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchConversations = async () => {
      try {
        setLoading(true);

        // Fetch conversations where user is either user1 or user2
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("chat_sessions")
          .select("*")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order("last_message_at", { ascending: false });

        if (sessionsError) {
          console.error("Error fetching conversations:", sessionsError);
          return;
        }

        if (!sessionsData || sessionsData.length === 0) {
          setConversations([]);
          return;
        }

        // Fetch additional details for each conversation
        const enrichedConversations = await Promise.all(
          sessionsData.map(async (session: any) => {
            // Determine other party ID
            const otherPartyId = session.user1_id === user.id ? session.user2_id : session.user1_id;

            // Fetch other party's profile
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, company_name")
              .eq("user_id", otherPartyId)
              .single();

            // Fetch last message
            const { data: lastMessageData } = await supabase
              .from("chat_messages")
              .select("message_content, created_at")
              .eq("chat_session_id", session.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Count unread messages (messages from other party)
            const { count: unreadCount } = await supabase
              .from("chat_messages")
              .select("*", { count: "exact", head: true })
              .eq("chat_session_id", session.id)
              .neq("sender_id", user.id);

            return {
              ...session,
              other_party_name: profileData?.full_name || "User",
              other_party_company: profileData?.company_name,
              last_message: (lastMessageData as any)?.message_content || "No messages yet",
              unread_count: unreadCount || 0,
            };
          })
        );

        setConversations(enrichedConversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Subscribe to real-time updates for new messages
    const channel = supabase
      .channel("chat_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.item_name?.toLowerCase().includes(searchLower) ||
      conv.other_party_name?.toLowerCase().includes(searchLower) ||
      conv.other_party_company?.toLowerCase().includes(searchLower)
    );
  });

  const handleConversationClick = (conversation: Conversation) => {
    // Determine other user ID for navigation
    const otherUserId = conversation.user1_id === user?.id ? conversation.user2_id : conversation.user1_id;
    
    navigate(
      `/chat?other_user=${otherUserId}&item=${conversation.item_id}&type=${conversation.item_type}&name=${encodeURIComponent(conversation.item_name)}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <EnhancedHeader />
      <div className="flex-1 flex">
        <SidebarProvider>
          <DashboardSidebar userProfile={userProfile} />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <MessageCircle className="h-8 w-8" />
                    Messages
                  </h1>
                  <p className="text-muted-foreground mt-1">Manage your conversations</p>
                </div>
              </div>

              {/* Search Bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Conversations List */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start a conversation by clicking "Chat with Seller" on any robot, part, or service
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredConversations.map((conversation) => (
                    <Card
                      key={conversation.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleConversationClick(conversation)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Header with name and badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <h3 className="font-semibold truncate">
                                {conversation.other_party_company || conversation.other_party_name}
                              </h3>
                              {conversation.unread_count > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {conversation.unread_count} new
                                </Badge>
                              )}
                            </div>

                            {/* Item name */}
                            <p className="text-sm text-primary font-medium truncate mb-2">
                              {conversation.item_name}
                            </p>

                            {/* Last message preview */}
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {conversation.last_message}
                            </p>

                            {/* Timestamp */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(conversation.last_message_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Status badge */}
                          <Badge
                            variant={conversation.status === "active" ? "default" : "secondary"}
                            className="flex-shrink-0"
                          >
                            {conversation.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </div>
      <Footer />
    </div>
  );
};

export default Messages;
