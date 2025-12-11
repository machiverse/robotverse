import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Phone, 
  Mail, 
  Building2,
  Calendar,
  MessageSquare,
  FileText,
  Loader2,
  User,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  MessageCircle,
  FileSpreadsheet,
  History,
  Send,
  Bell,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Plus
} from 'lucide-react';
import { type Lead, type LeadActivity } from '@/hooks/useSellerCRM';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface LeadDetailViewProps {
  lead: Lead;
  activities: LeadActivity[];
  onClose: () => void;
  onStatusChange: (leadId: string, status: Lead['status']) => Promise<boolean>;
  onAddActivity: (
    leadId: string,
    activityType: LeadActivity['activity_type'],
    title: string,
    description?: string,
    scheduledAt?: string,
    reminderAt?: string
  ) => Promise<boolean>;
  onUpdateNotes: (leadId: string, notes: string) => Promise<boolean>;
  onScheduleFollowUp: (leadId: string, date: string) => Promise<boolean>;
  onSendQuotation: (data: QuotationData) => Promise<void>;
}

interface QuotationData {
  items: { name: string; quantity: number; unit_price: number }[];
  notes: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  message_content: string;
  created_at: string;
  is_read: boolean;
}

interface ProductDetails {
  name: string;
  images: string[];
  price: number | null;
  description: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
}

const STATUS_PIPELINE: { status: Lead['status']; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'bg-blue-500' },
  { status: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { status: 'quoted', label: 'Quoted', color: 'bg-purple-500' },
  { status: 'negotiating', label: 'Negotiating', color: 'bg-orange-500' },
  { status: 'closed_won', label: 'Won', color: 'bg-green-500' },
  { status: 'closed_lost', label: 'Lost', color: 'bg-red-500' }
];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <FileText className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  meeting: <Calendar className="w-4 h-4" />,
  follow_up: <Bell className="w-4 h-4" />,
  status_change: <CheckCircle className="w-4 h-4" />,
  invoice_sent: <FileSpreadsheet className="w-4 h-4" />,
  chat: <MessageSquare className="w-4 h-4" />
};

const LeadDetailView = ({
  lead,
  activities,
  onClose,
  onStatusChange,
  onAddActivity,
  onUpdateNotes,
  onScheduleFollowUp,
  onSendQuotation
}: LeadDetailViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState(lead.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  
  // Follow-up form
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);
  
  // Quotation form
  const [quotationItems, setQuotationItems] = useState([
    { name: lead.item_name || '', quantity: 1, unit_price: lead.expected_value || 0 }
  ]);
  const [quotationNotes, setQuotationNotes] = useState('');
  const [sendingQuotation, setSendingQuotation] = useState(false);
  
  // Activity form
  const [newActivityType, setNewActivityType] = useState<LeadActivity['activity_type']>('note');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  // Fetch chat messages
  useEffect(() => {
    const fetchChatMessages = async () => {
      if (!lead.buyer_id || !user?.id) return;
      
      setLoadingChat(true);
      try {
        const { data: sessions } = await supabase
          .from('chat_sessions')
          .select('id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${lead.buyer_id}),and(user1_id.eq.${lead.buyer_id},user2_id.eq.${user.id})`)
          .eq('item_id', lead.item_id);

        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id);
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('*')
            .in('chat_session_id', sessionIds)
            .order('created_at', { ascending: true });
          
          setChatMessages(messages || []);
        }
      } catch (error) {
        console.error('Error fetching chat messages:', error);
      } finally {
        setLoadingChat(false);
      }
    };

    fetchChatMessages();
  }, [lead.buyer_id, lead.item_id, user?.id]);

  // Fetch product details
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!lead.item_id) return;
      
      setLoadingProduct(true);
      try {
        let data = null;
        if (lead.item_type === 'robots') {
          const { data: robot } = await supabase
            .from('robots')
            .select('name, images, price, description, brand, model, condition')
            .eq('id', lead.item_id)
            .single();
          data = robot;
        } else if (lead.item_type === 'spare_parts') {
          const { data: part } = await supabase
            .from('spare_parts')
            .select('name, images, price, description, brand, model, condition')
            .eq('id', lead.item_id)
            .single();
          data = part;
        } else if (lead.item_type === 'services') {
          const { data: service } = await supabase
            .from('services')
            .select('name, description, price_range')
            .eq('id', lead.item_id)
            .single();
          if (service) {
            data = {
              name: service.name,
              description: service.description,
              images: [],
              price: null,
              brand: null,
              model: null,
              condition: null
            };
          }
        }
        setProductDetails(data as ProductDetails);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchProductDetails();
  }, [lead.item_id, lead.item_type]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onUpdateNotes(lead.id, notes);
    setSavingNotes(false);
    toast({ title: 'Notes saved' });
  };

  const handleScheduleFollowUp = async () => {
    if (!followUpDate) return;
    setSchedulingFollowUp(true);
    await onScheduleFollowUp(lead.id, followUpDate);
    if (followUpNote) {
      await onAddActivity(lead.id, 'follow_up', 'Follow-up Scheduled', followUpNote, followUpDate);
    }
    setFollowUpDate('');
    setFollowUpNote('');
    setSchedulingFollowUp(false);
    toast({ title: 'Follow-up scheduled', description: `Set for ${format(new Date(followUpDate), 'PPP')}` });
  };

  const handleAddActivity = async () => {
    if (!newActivityTitle) return;
    setAddingActivity(true);
    await onAddActivity(lead.id, newActivityType, newActivityTitle, newActivityDesc);
    setNewActivityTitle('');
    setNewActivityDesc('');
    setAddingActivity(false);
    toast({ title: 'Activity added' });
  };

  const handleSendQuotation = async () => {
    setSendingQuotation(true);
    await onSendQuotation({ items: quotationItems, notes: quotationNotes });
    setSendingQuotation(false);
    toast({ title: 'Quotation sent' });
  };

  const handleStartChat = async () => {
    if (!lead.buyer_id) return;
    
    try {
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${lead.buyer_id}),and(user1_id.eq.${lead.buyer_id},user2_id.eq.${user?.id})`)
        .eq('item_id', lead.item_id)
        .single();

      if (existingSession) {
        navigate(`/chat?session=${existingSession.id}`);
      } else {
        const { data: newSession, error } = await supabase
          .from('chat_sessions')
          .insert({
            user1_id: user?.id,
            user2_id: lead.buyer_id,
            item_id: lead.item_id,
            item_type: lead.item_type,
            item_name: lead.item_name
          })
          .select('id')
          .single();

        if (!error && newSession) {
          await onAddActivity(lead.id, 'chat', 'Chat Started', `Started chat with ${lead.buyer_name}`);
          navigate(`/chat?session=${newSession.id}`);
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to start chat' });
    }
  };

  const handleWhatsApp = () => {
    if (!lead.buyer_phone) return;
    const phone = lead.buyer_phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi ${lead.buyer_name}, I'm reaching out regarding your inquiry about ${lead.item_name}. How can I help you?`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    onAddActivity(lead.id, 'call', 'WhatsApp Sent', 'Contacted via WhatsApp');
  };

  const handleEmail = () => {
    if (!lead.buyer_email) return;
    const subject = encodeURIComponent(`Regarding your inquiry: ${lead.item_name}`);
    const body = encodeURIComponent(`Dear ${lead.buyer_name},\n\nThank you for your interest in ${lead.item_name}.\n\nPlease let me know how I can assist you further.\n\nBest regards`);
    window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`, '_blank');
    onAddActivity(lead.id, 'email', 'Email Sent', `Sent email to ${lead.buyer_email}`);
  };

  const handleCall = () => {
    if (!lead.buyer_phone) return;
    window.open(`tel:${lead.buyer_phone}`, '_blank');
    onAddActivity(lead.id, 'call', 'Phone Call Made', `Called ${lead.buyer_phone}`);
  };

  const currentStatusIndex = STATUS_PIPELINE.findIndex(s => s.status === lead.status);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                {lead.is_unlocked ? lead.buyer_name : 'Locked Lead'}
                {lead.is_unlocked && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30">Unlocked</Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">{lead.item_name} • {lead.item_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lead.is_unlocked && (
              <>
                <Button size="sm" variant="outline" onClick={handleCall}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button size="sm" variant="outline" onClick={handleEmail}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button size="sm" variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200" onClick={handleWhatsApp}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button size="sm" onClick={handleStartChat}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="mt-4 flex items-center gap-2">
          {STATUS_PIPELINE.map((stage, index) => {
            const isActive = lead.status === stage.status;
            const isPast = index < currentStatusIndex;
            const isClosed = lead.status === 'closed_won' || lead.status === 'closed_lost';
            
            return (
              <div key={stage.status} className="flex items-center">
                <button
                  onClick={() => !isClosed && onStatusChange(lead.id, stage.status)}
                  disabled={isClosed}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive ? `${stage.color} text-white` : ''}
                    ${isPast && !isActive ? 'bg-muted text-muted-foreground' : ''}
                    ${!isPast && !isActive ? 'bg-muted/50 text-muted-foreground hover:bg-muted' : ''}
                    ${isClosed && !isActive ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {stage.label}
                </button>
                {index < STATUS_PIPELINE.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Buyer & Product Info */}
        <div className="w-80 border-r bg-muted/30 p-4 overflow-y-auto">
          {/* Buyer Profile Card */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Buyer Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.is_unlocked ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback>{lead.buyer_name?.charAt(0) || 'B'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{lead.buyer_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.buyer_company || 'Individual'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${lead.buyer_phone}`} className="text-primary hover:underline">{lead.buyer_phone}</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${lead.buyer_email}`} className="text-primary hover:underline truncate">{lead.buyer_email}</a>
                    </div>
                    {lead.buyer_company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{lead.buyer_company}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Buyer details are locked</p>
                  <p className="text-xs text-muted-foreground mt-1">Unlock to view contact info</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProduct ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : productDetails ? (
                <div className="space-y-3">
                  {productDetails.images && productDetails.images.length > 0 && (
                    <img 
                      src={productDetails.images[0]} 
                      alt={productDetails.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-medium">{productDetails.name}</p>
                    <Badge variant="outline" className="mt-1 capitalize">{lead.item_type}</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    {productDetails.brand && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brand</span>
                        <span className="font-medium">{productDetails.brand}</span>
                      </div>
                    )}
                    {productDetails.model && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-medium">{productDetails.model}</span>
                      </div>
                    )}
                    {productDetails.condition && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Condition</span>
                        <span className="font-medium capitalize">{productDetails.condition}</span>
                      </div>
                    )}
                    {productDetails.price && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-medium">₹{productDetails.price.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  {lead.expected_value && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expected Deal Value</span>
                        <span className="font-medium text-green-600">₹{lead.expected_value.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Product details not available</p>
              )}
            </CardContent>
          </Card>

          {/* Lead Info */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Lead Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(lead.created_at), 'PP')}</span>
              </div>
              {lead.last_contacted_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span>{formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}</span>
                </div>
              )}
              {lead.next_follow_up && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Follow-up</span>
                  <span className="text-orange-600 font-medium">{format(new Date(lead.next_follow_up), 'PP')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="capitalize">{lead.source}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="communication">Communication History</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups & Reminders</TabsTrigger>
              <TabsTrigger value="quotation">Send Quotation</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                  <p className="text-2xl font-bold">{activities.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold">{chatMessages.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Days in Pipeline</p>
                  <p className="text-2xl font-bold">
                    {Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`mt-1 ${STATUS_PIPELINE.find(s => s.status === lead.status)?.color} text-white`}>
                    {STATUS_PIPELINE.find(s => s.status === lead.status)?.label}
                  </Badge>
                </Card>
              </div>

              {/* Notes Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this lead..."
                    rows={4}
                    className="mb-3"
                  />
                  <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm">
                    {savingNotes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    Save Notes
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                          <div className="p-2 rounded-full bg-muted">
                            {ACTIVITY_ICONS[activity.activity_type] || <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{activity.title}</p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(activity.created_at), 'PPp')}
                            </p>
                          </div>
                          {activity.is_completed && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Add Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Log Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as LeadActivity['activity_type'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Activity title"
                      value={newActivityTitle}
                      onChange={(e) => setNewActivityTitle(e.target.value)}
                    />
                  </div>
                  <Textarea
                    placeholder="Description (optional)"
                    value={newActivityDesc}
                    onChange={(e) => setNewActivityDesc(e.target.value)}
                    rows={2}
                  />
                  <Button onClick={handleAddActivity} disabled={addingActivity || !newActivityTitle} size="sm">
                    {addingActivity ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Activity
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Communication History Tab */}
            <TabsContent value="communication" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Chat Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingChat ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : chatMessages.length > 0 ? (
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-4">
                        {chatMessages.map((msg) => {
                          const isOwn = msg.sender_id === user?.id;
                          return (
                            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm">{msg.message_content}</p>
                                <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  {format(new Date(msg.created_at), 'p')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No chat messages yet</p>
                      {lead.is_unlocked && (
                        <Button className="mt-4" size="sm" onClick={handleStartChat}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Start Chat
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4" />
                    All Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                            <div className="p-2 rounded-full bg-muted">
                              {ACTIVITY_ICONS[activity.activity_type] || <FileText className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{activity.title}</p>
                                <Badge variant="outline" className="text-xs capitalize">{activity.activity_type.replace('_', ' ')}</Badge>
                              </div>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(activity.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No activities recorded</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Follow-ups Tab */}
            <TabsContent value="followups" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule Follow-up
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Follow-up Date</label>
                      <Input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Current Next Follow-up</label>
                      <p className={`p-2 rounded border ${lead.next_follow_up ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-muted'}`}>
                        {lead.next_follow_up ? format(new Date(lead.next_follow_up), 'PPP') : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Notes</label>
                    <Textarea
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      placeholder="Add notes for this follow-up..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleScheduleFollowUp} disabled={!followUpDate || schedulingFollowUp}>
                    {schedulingFollowUp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                    Schedule Follow-up
                  </Button>
                </CardContent>
              </Card>

              {/* Pending Follow-ups */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Scheduled Follow-ups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.filter(a => a.activity_type === 'follow_up' && !a.is_completed).length > 0 ? (
                    <div className="space-y-3">
                      {activities
                        .filter(a => a.activity_type === 'follow_up' && !a.is_completed)
                        .map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{activity.title}</p>
                              {activity.scheduled_at && (
                                <p className="text-sm text-orange-600">
                                  {format(new Date(activity.scheduled_at), 'PPP')}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">Pending</Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending follow-ups</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quotation Tab */}
            <TabsContent value="quotation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Create & Send Quotation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!lead.is_unlocked ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Unlock buyer details to send quotation</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm"><strong>To:</strong> {lead.buyer_name}</p>
                        <p className="text-sm"><strong>Email:</strong> {lead.buyer_email}</p>
                        <p className="text-sm"><strong>Product:</strong> {lead.item_name}</p>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium">Items</label>
                        {quotationItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2">
                            <Input
                              placeholder="Item name"
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...quotationItems];
                                newItems[index].name = e.target.value;
                                setQuotationItems(newItems);
                              }}
                              className="col-span-6"
                            />
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...quotationItems];
                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                setQuotationItems(newItems);
                              }}
                              className="col-span-2"
                            />
                            <Input
                              type="number"
                              placeholder="Price"
                              value={item.unit_price}
                              onChange={(e) => {
                                const newItems = [...quotationItems];
                                newItems[index].unit_price = parseFloat(e.target.value) || 0;
                                setQuotationItems(newItems);
                              }}
                              className="col-span-4"
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuotationItems([...quotationItems, { name: '', quantity: 1, unit_price: 0 }])}
                        >
                          + Add Item
                        </Button>
                      </div>

                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>₹{quotationItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>GST (18%):</span>
                          <span>₹{(quotationItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0) * 0.18).toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>₹{(quotationItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0) * 1.18).toLocaleString()}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Notes</label>
                        <Textarea
                          value={quotationNotes}
                          onChange={(e) => setQuotationNotes(e.target.value)}
                          placeholder="Additional notes for the quotation..."
                          rows={3}
                        />
                      </div>

                      <Button onClick={handleSendQuotation} disabled={sendingQuotation} className="w-full">
                        {sendingQuotation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Send Quotation
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailView;
