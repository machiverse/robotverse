import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Search, RefreshCw, User, Calendar, Package, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatConversation {
  session_id: string;
  user1_id: string;
  user2_id: string;
  user1_name: string;
  user1_email: string;
  user2_name: string;
  user2_email: string;
  item_id: string;
  item_name: string;
  item_type: string;
  last_message_at: string;
  created_at: string;
  status: string;
  message_count: number;
}

interface ChatMessage {
  message_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  message_content: string;
  created_at: string;
  is_read: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
}

const AdminChatMonitoring = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_chat_conversations_with_users');
      
      if (error) {
        console.error('Error fetching conversations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat conversations',
          variant: 'destructive',
        });
        return;
      }

      setConversations(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      setMessagesLoading(true);
      const { data, error } = await supabase.rpc('get_chat_messages_for_session', {
        p_session_id: sessionId,
      });
      
      if (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.session_id);
    }
  }, [selectedConversation]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = 
      conv.user1_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.user2_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.user1_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.user2_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || conv.item_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Chat Monitoring</h2>
          <p className="text-muted-foreground">Monitor all chat communications across the platform</p>
        </div>
        <Button onClick={fetchConversations} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversations.reduce((sum, conv) => sum + (conv.message_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversations.filter(c => {
                const lastMsg = new Date(c.last_message_at);
                const today = new Date();
                return lastMsg.toDateString() === today.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Item Type</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div>Robots: {conversations.filter(c => c.item_type === 'robots').length}</div>
              <div>Parts: {conversations.filter(c => c.item_type === 'spare_parts').length}</div>
              <div>Services: {conversations.filter(c => c.item_type === 'services').length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <div className="flex gap-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="robots">Robots</SelectItem>
                  <SelectItem value="spare_parts">Spare Parts</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="text-center text-muted-foreground py-8">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No conversations found</div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.session_id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedConversation?.session_id === conv.session_id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {conv.user1_name || conv.user1_email}
                            <span className="text-muted-foreground">↔</span>
                            {conv.user2_name || conv.user2_email}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Package className="h-3 w-3" />
                            {conv.item_name || 'Unknown Item'}
                          </div>
                        </div>
                        <Badge variant="outline">{conv.message_count}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {conv.last_message_at 
                          ? format(new Date(conv.last_message_at), 'MMM dd, yyyy HH:mm')
                          : 'No messages'}
                      </div>
                      <Badge className="mt-2" variant="secondary">
                        {conv.item_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            {selectedConversation && (
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <strong>User 1:</strong> {selectedConversation.user1_name || 'N/A'} ({selectedConversation.user1_email})
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <strong>User 2:</strong> {selectedConversation.user2_name || 'N/A'} ({selectedConversation.user2_email})
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <strong>Item:</strong> {selectedConversation.item_name}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedConversation ? (
              <div className="text-center text-muted-foreground py-8">
                Select a conversation to view messages
              </div>
            ) : messagesLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading messages...</div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No messages in this conversation</div>
                  ) : (
                    messages.map((msg) => {
                      const isUser1 = msg.sender_id === selectedConversation.user1_id;
                      return (
                        <div
                          key={msg.message_id}
                          className={`p-4 rounded-lg ${
                            isUser1 ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {msg.sender_name || msg.sender_email}
                            </div>
                            <div className="flex items-center gap-2">
                              {msg.is_read && <CheckCircle className="h-3 w-3 text-success" />}
                              {msg.is_blocked && <XCircle className="h-3 w-3 text-red-500" />}
                            </div>
                          </div>
                          <p className="text-sm mb-2">{msg.message_content}</p>
                          {msg.is_blocked && msg.blocked_reason && (
                            <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 rounded text-xs">
                              <AlertCircle className="h-3 w-3 text-destructive mt-0.5" />
                              <span className="text-destructive">{msg.blocked_reason}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(msg.created_at), 'MMM dd, yyyy HH:mm:ss')}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminChatMonitoring;
