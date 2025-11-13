import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { Skeleton } from "@/components/ui/skeleton";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOrGetConversation } = useChat();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract URL parameters
  const sellerId = searchParams.get("seller");
  const itemId = searchParams.get("item");
  const itemType = searchParams.get("type") as "robot" | "spare_part" | "service" | null;
  const itemName = searchParams.get("name") || "";

  useEffect(() => {
    let isMounted = true;

    const initChat = async () => {
      try {
        setError(null);
        setLoading(true);

        // Check user authentication
        if (!user) {
          navigate("/auth");
          return;
        }

        // Validate all required parameters
        if (!sellerId || !itemId || !itemType) {
          setError("Missing required parameters");
          navigate("/");
          return;
        }

        // Validate itemType is one of the allowed values
        const validTypes = ["robot", "spare_part", "service"];
        if (!validTypes.includes(itemType)) {
          setError("Invalid item type");
          navigate("/");
          return;
        }

        // Create or fetch existing conversation
        const convId = await createOrGetConversation(sellerId, itemId, itemType, decodeURIComponent(itemName));

        if (!isMounted) return;

        if (convId) {
          setConversationId(convId);
        } else {
          setError("Failed to create conversation");
          navigate(-1);
        }
      } catch (err) {
        console.error("Error initializing chat:", err);
        if (isMounted) {
          setError("An unexpected error occurred");
          navigate(-1);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initChat();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [user, sellerId, itemId, itemType, itemName, navigate, createOrGetConversation]);

  return (
    <div className="min-h-screen flex flex-col">
      <EnhancedHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {loading ? (
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-[600px] w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-destructive/10 border border-destructive text-destructive p-6 rounded-lg text-center">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-2">{error}</p>
              <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
                Go Back
              </Button>
            </div>
          </div>
        ) : conversationId ? (
          <div className="max-w-4xl mx-auto">
            <ChatWindow conversationId={conversationId} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load chat</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Chat;
