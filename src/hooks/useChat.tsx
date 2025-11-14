import { useState, useEffect } from "react";
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
    message_content: msg.message || msg.message_content || "",
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
   * Create a new conversation or return existing one
   */
  const createOrGetConversation = async (
    sellerId: string,
    itemId: string,
    itemType: "robot" | "spare_part" | "service",
    itemName: string,
  ): Promise<string | null> => {
    // Validate user is authenticated
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to start a chat",
        variant: "destructive",
      });
      return null;
    }

    // Validate all parameters
    if (!sellerId || !itemId || !itemType) {
      toast({
        title: "Invalid Parameters",
        description: "Missing required information to start chat",
        variant: "destructive",
      });
      return null;
    }

    try {
      // Check if conversation already exists (either direction: buyer->seller or seller->buyer)
      const { data: existingConversations, error: fetchError } = await supabase
        .from("chat_sessions")
        .select("id, buyer_id, seller_id")
        .eq("robot_id", itemId)
        .eq("item_type", itemType)
        .or(`and(buyer_id.eq.${user.id},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${user.id})`);

      if (fetchError) {
        console.error("Error fetching existing conversation:", fetchError);
        throw fetchError;
      }

      // Return existing conversation ID if found
      if (existingConversations && existingConversations.length > 0) {
        console.log("Existing conversation found:", existingConversations[0].id);
        return existingConversations[0].id;
      }

      // Create new conversation
      const { data, error: createError } = await supabase
        .from("chat_sessions")
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          robot_id: itemId,
          item_type: itemType,
          item_name: itemName,
          status: "active",
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
        throw createError;
      }

      if (!data) {
        throw new Error("No data returned from conversation creation");
      }

      toast({
        title: "Chat Started",
        description: `You can now chat about ${itemName}`,
      });

      return data.id;
    } catch (error: any) {
      console.error("Error in createOrGetConversation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start chat",
        variant: "destructive",
      });
      return null;
    }
  };

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

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          chat_session_id: conversationId,
          sender_id: user.id,
          message: content.trim(),
          is_blocked: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from message creation");
      }

      // Transform and add to local state
      const transformedMessage = transformMessage(data, conversationId);
      setMessages((prev) => [...prev, transformedMessage]);

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
