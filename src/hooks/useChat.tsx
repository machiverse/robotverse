import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_content: string;
  is_read: boolean;
  is_blocked: boolean;
  blocked_reason?: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  robot_id?: string;
  item_type: string;
  item_name?: string;
  status: string;
  last_message_at: string;
  created_at: string;
}

export const useChat = (conversationId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  /**
   * Transform database message to ChatMessage interface
   */
  const transformMessage = (msg: any, convId: string): ChatMessage => ({
    id: msg.id,
    conversation_id: convId,
    sender_id: msg.sender_id,
    message_content: msg.message_content || "",
    is_read: msg.is_read || true,
    is_blocked: msg.is_blocked || false,
    blocked_reason: msg.blocked_reason,
    created_at: msg.created_at,
  });

  /**
   * Fetch all messages for a conversation
   */
  const fetchMessages = async (convId: string) => {
    if (!convId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_session_id", convId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      const transformedMessages = (data || []).map((msg) => transformMessage(msg, convId));

      setMessages(transformedMessages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch conversation details
   */
  const fetchConversation = async (convId: string) => {
    if (!convId) return;

    try {
      const { data, error } = await supabase.from("chat_sessions").select("*").eq("id", convId).single();

      if (error) {
        console.error("Error fetching conversation:", error);
        throw error;
      }

      if (data) {
        setConversation(data as ChatConversation);
      }
    } catch (error: any) {
      console.error("Error fetching conversation:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation details",
        variant: "destructive",
      });
    }
  };

  /**
   * Create or get a conversation between two users for a specific item
   */
  const createOrGetConversation = useCallback(
    async (
      otherUserId: string,
      itemId: string,
      itemType: "robot" | "spare_part" | "service",
      itemName: string,
      productDetails?: Record<string, any>
    ): Promise<string | null> => {
      try {
        if (!user?.id) {
          throw new Error("User must be logged in");
        }

        if (!otherUserId) {
          throw new Error("Other user ID is required");
        }

        if (user.id === otherUserId) {
          throw new Error("Cannot chat with yourself");
        }

        if (!itemType || !["robot", "spare_part", "service"].includes(itemType)) {
          throw new Error("Invalid item type");
        }

        // Normalize user IDs: always store smaller ID in user1_id
        const user1_id = user.id < otherUserId ? user.id : otherUserId;
        const user2_id = user.id < otherUserId ? otherUserId : user.id;

        console.log("Creating/getting conversation:", {
          user1_id,
          user2_id,
          itemId,
          itemType,
          itemName,
        });

        // Try to find existing conversation (bypass stale types)
        const { data: existingConversation, error: fetchError } = await ((supabase as any)
          .from("chat_sessions")
          .select("*")
          .eq("user1_id", user1_id)
          .eq("user2_id", user2_id)
          .eq("item_id", itemId)
          .eq("item_type", itemType)
          .maybeSingle());

        if (fetchError) {
          console.error("Error fetching conversation:", fetchError);
          throw fetchError;
        }

        if (existingConversation) {
          console.log("Found existing conversation:", existingConversation.id);
          return existingConversation.id;
        }

        // Create new conversation
        const { data: newConversation, error: insertError } = await supabase
          .from("chat_sessions")
          .insert({
            user1_id,
            user2_id,
            item_id: itemId,
            item_type: itemType,
            item_name: itemName,
            product_details: productDetails || {},
            status: "active",
          } as any)
          .select()
          .single();

        if (insertError) {
          console.error("Error creating conversation:", insertError);
          throw insertError;
        }

        console.log("Created new conversation:", newConversation.id);
        return newConversation.id;
      } catch (error) {
        console.error("Error in createOrGetConversation:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create conversation",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, toast]
  );

  /**
   * Send a new message in the conversation
   */
  const sendMessage = async (content: string): Promise<ChatMessage | null> => {
    // Validate prerequisites
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return null;
    }

    if (!conversationId) {
      toast({
        title: "Error",
        description: "No conversation selected",
        variant: "destructive",
      });
      return null;
    }

    if (!content.trim()) {
      return null;
    }

    try {
      setSending(true);

      // Filter content for sensitive information
      const { filterChatMessage } = await import("@/utils/chatContentFilter");
      const filterResult = filterChatMessage(content.trim());

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          chat_session_id: conversationId,
          sender_id: user.id,
          message_content: content.trim(),
          is_blocked: filterResult.isBlocked,
          blocked_reason: filterResult.reason,
        } as any)
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from message creation");
      }

      // Transform and add to local state immediately
      const transformedMessage = transformMessage(data, conversationId);
      
      // Use callback form to ensure we have latest state
      setMessages((prev) => {
        // Check if message already exists (in case real-time beat us)
        if (prev.find(msg => msg.id === transformedMessage.id)) {
          return prev;
        }
        return [...prev, transformedMessage];
      });

      return transformedMessage;
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      return null;
    } finally {
      setSending(false);
    }
  };

  /**
   * Subscribe to real-time message updates
   */
  useEffect(() => {
    if (!conversationId) {
      return;
    }

    // Fetch initial data
    fetchMessages(conversationId);
    fetchConversation(conversationId);

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_session_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          const transformedMessage = transformMessage(newMsg, conversationId);

          setMessages((prev) => {
            // Prevent duplicate messages
            if (prev.find((msg) => msg.id === transformedMessage.id)) {
              return prev;
            }
            return [...prev, transformedMessage];
          });
        },
      )
      .subscribe();

    // Cleanup: unsubscribe and remove channel
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return {
    messages,
    conversation,
    loading,
    sending,
    sendMessage,
    createOrGetConversation,
    fetchMessages,
    fetchConversation,
  };
};
