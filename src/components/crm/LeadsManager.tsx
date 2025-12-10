import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Lock, 
  Unlock, 
  Phone, 
  Mail, 
  Building2,
  Calendar,
  MessageSquare,
  FileText,
  MoreHorizontal,
  Loader2,
  Filter,
  Eye,
  Send,
  ExternalLink,
  User,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  MessageCircle,
  FileSpreadsheet,
  History
} from 'lucide-react';
import { useSellerCRM, type Lead, type LeadActivity, type ProductView } from '@/hooks/useSellerCRM';
import { format, formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeadsManagerProps {
  sellerId: string;
  itemType?: string;
}

const STATUS_CONFIG: Record<Lead['status'], { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  contacted: { label: 'Contacted', color: 'text-yellow-700', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  quoted: { label: 'Quoted', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  negotiating: { label: 'Negotiating', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  closed_won: { label: 'Won', color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-900/30' },
  closed_lost: { label: 'Lost', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30' }
};

const PRIORITY_CONFIG: Record<Lead['priority'], { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-600' },
  medium: { label: 'Medium', color: 'text-blue-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' }
};

const LeadsManager = ({ sellerId, itemType }: LeadsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    leads, 
    productViews,
    unlockBuyerInfo, 
    updateLeadStatus, 
    updateLeadNotes,
    scheduleFollowUp,
    addActivity,
    creditsBalance,
    activities,
    createInvoice,
    stats
  } = useSellerCRM(itemType);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewTab, setViewTab] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [notes, setNotes] = useState('');
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);

  // Quotation form state
  const [quotationItems, setQuotationItems] = useState([{ name: '', quantity: 1, unit_price: 0 }]);
  const [quotationNotes, setQuotationNotes] = useState('');
  const [sendingQuotation, setSendingQuotation] = useState(false);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.buyer_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredViews = productViews.filter(view => {
    const matchesSearch = !searchQuery || 
      view.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      view.user_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      view.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const handleUnlock = async (lead: Lead) => {
    setUnlocking(lead.id);
    await unlockBuyerInfo(lead.id, lead.item_type);
    setUnlocking(null);
  };

  const handleStatusChange = async (leadId: string, status: Lead['status']) => {
    await updateLeadStatus(leadId, status);
  };

  const handleScheduleFollowUp = async () => {
    if (!selectedLead || !followUpDate) return;
    await scheduleFollowUp(selectedLead.id, followUpDate);
    if (followUpNote) {
      await addActivity(selectedLead.id, 'follow_up', 'Follow-up Scheduled', followUpNote, followUpDate);
    }
    setShowFollowUpModal(false);
    setFollowUpDate('');
    setFollowUpNote('');
    toast({
      title: "Follow-up Scheduled",
      description: `Follow-up set for ${format(new Date(followUpDate), 'PPP')}`
    });
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    await updateLeadNotes(selectedLead.id, notes);
    await addActivity(selectedLead.id, 'note', 'Note Added', notes);
    setShowLeadModal(false);
  };

  const handleStartChat = async (lead: Lead) => {
    if (!lead.is_unlocked || !lead.buyer_id) {
      toast({
        variant: "destructive",
        title: "Cannot Start Chat",
        description: "Buyer information must be unlocked first"
      });
      return;
    }

    try {
      // Check for existing chat session
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${lead.buyer_id}),and(user1_id.eq.${lead.buyer_id},user2_id.eq.${user?.id})`)
        .eq('item_id', lead.item_id)
        .single();

      if (existingSession) {
        navigate(`/chat?session=${existingSession.id}`);
      } else {
        // Create new chat session
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

        if (error) throw error;
        
        await addActivity(lead.id, 'chat', 'Chat Started', `Started chat with ${lead.buyer_name}`);
        navigate(`/chat?session=${newSession.id}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start chat"
      });
    }
  };

  const handleWhatsApp = (lead: Lead) => {
    if (!lead.is_unlocked || !lead.buyer_phone) return;
    const phone = lead.buyer_phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi ${lead.buyer_name}, I'm reaching out regarding your inquiry about ${lead.item_name}. How can I help you?`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    addActivity(lead.id, 'call', 'WhatsApp Sent', `Contacted via WhatsApp`);
  };

  const handleEmail = (lead: Lead) => {
    if (!lead.is_unlocked || !lead.buyer_email) return;
    const subject = encodeURIComponent(`Regarding your inquiry: ${lead.item_name}`);
    const body = encodeURIComponent(`Dear ${lead.buyer_name},\n\nThank you for your interest in ${lead.item_name}.\n\nPlease let me know how I can assist you further.\n\nBest regards`);
    window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`, '_blank');
    addActivity(lead.id, 'email', 'Email Sent', `Sent email to ${lead.buyer_email}`);
  };

  const handleCall = (lead: Lead) => {
    if (!lead.is_unlocked || !lead.buyer_phone) return;
    window.open(`tel:${lead.buyer_phone}`, '_blank');
    addActivity(lead.id, 'call', 'Phone Call Made', `Called ${lead.buyer_phone}`);
  };

  const handleSendQuotation = async () => {
    if (!selectedLead || quotationItems.length === 0) return;
    
    setSendingQuotation(true);
    try {
      const items = quotationItems.map(item => ({
        name: item.name || selectedLead.item_name || 'Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }));

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = subtotal * 0.18;
      const totalAmount = subtotal + taxAmount;

      await createInvoice({
        buyer_name: selectedLead.buyer_name || '',
        buyer_email: selectedLead.buyer_email,
        buyer_phone: selectedLead.buyer_phone,
        buyer_company: selectedLead.buyer_company,
        lead_id: selectedLead.id,
        items,
        subtotal,
        tax_rate: 18,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: quotationNotes,
        status: 'sent'
      });

      await updateLeadStatus(selectedLead.id, 'quoted');
      await addActivity(selectedLead.id, 'invoice_sent', 'Quotation Sent', `Quotation of ₹${totalAmount.toLocaleString()} sent`);

      setShowQuotationModal(false);
      setQuotationItems([{ name: '', quantity: 1, unit_price: 0 }]);
      setQuotationNotes('');
      
      toast({
        title: "Quotation Sent",
        description: "Quotation has been created and sent successfully"
      });
    } catch (error) {
      console.error('Error sending quotation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send quotation"
      });
    } finally {
      setSendingQuotation(false);
    }
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || '');
    // Filter activities for this lead
    setLeadActivities(activities.filter(a => a.lead_id === lead.id));
    setShowLeadModal(true);
  };

  const getMaskedValue = (value: string | null, isUnlocked: boolean): string => {
    if (isUnlocked && value) return value;
    return 'XXXXX';
  };

  const getCreditsNeeded = (leadItemType: string): number => {
    return leadItemType === 'robots' ? 10 : 5;
  };

  return (
    <div className="p-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{productViews.length}</p>
              <p className="text-xs text-muted-foreground">Total Views</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leads.length}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Unlock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leads.filter(l => l.is_unlocked).length}</p>
              <p className="text-xs text-muted-foreground">Unlocked</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{creditsBalance}</p>
              <p className="text-xs text-muted-foreground">Credits Balance</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs for Views and Leads */}
      <Tabs value={viewTab} onValueChange={setViewTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            All Product Views ({productViews.length})
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Leads ({leads.length})
          </TabsTrigger>
        </TabsList>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {viewTab === 'leads' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* All Product Views Tab */}
        <TabsContent value="all">
          {filteredViews.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No views yet</h3>
              <p className="text-muted-foreground">
                Views will appear here when users interact with your products
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredViews.map((view) => (
                <div
                  key={view.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {view.user_name || 'Anonymous User'}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {view.user_company || 'Unknown Company'}
                          </p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="flex flex-wrap gap-3 text-sm mb-3">
                        {view.user_mobile ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {view.user_mobile}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            Not provided
                          </span>
                        )}
                        {view.user_email ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {view.user_email}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            Not provided
                          </span>
                        )}
                        {view.user_location && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {view.user_location}
                          </span>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{view.item_name || 'Unknown Product'}</span>
                        <Badge variant="outline" className="text-xs capitalize">{view.item_type}</Badge>
                        <Badge variant="secondary" className="text-xs">{view.button_name}</Badge>
                      </div>
                    </div>

                    {/* Right: Time */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(view.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads">
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground">
            Leads will appear here when users interact with your products
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const statusConfig = STATUS_CONFIG[lead.status];
            const priorityConfig = PRIORITY_CONFIG[lead.priority];
            const creditsNeeded = getCreditsNeeded(lead.item_type);
            const canUnlock = creditsBalance >= creditsNeeded;

            return (
              <div
                key={lead.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Lead Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-full ${lead.is_unlocked ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                        {lead.is_unlocked ? (
                          <Unlock className="w-4 h-4 text-green-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {getMaskedValue(lead.buyer_name, lead.is_unlocked)}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {getMaskedValue(lead.buyer_company, lead.is_unlocked)}
                        </p>
                      </div>
                    </div>

                    {/* Contact Info - Show actual details when unlocked */}
                    <div className="flex flex-wrap gap-3 text-sm mb-3">
                      {lead.is_unlocked ? (
                        <>
                          <a 
                            href={`tel:${lead.buyer_phone}`} 
                            className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                            onClick={() => handleCall(lead)}
                          >
                            <Phone className="w-3 h-3" />
                            {lead.buyer_phone}
                          </a>
                          <a 
                            href={`mailto:${lead.buyer_email}`}
                            className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                          >
                            <Mail className="w-3 h-3" />
                            {lead.buyer_email}
                          </a>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            XXXXX
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            XXXXX
                          </span>
                        </>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">{lead.item_name || 'Unknown Product'}</span>
                      <Badge variant="outline" className="text-xs capitalize">{lead.item_type}</Badge>
                    </div>

                    {/* Quick Action Buttons for Unlocked Leads */}
                    {lead.is_unlocked && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStartChat(lead)}
                          className="h-8 text-xs"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Start Chat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsApp(lead)}
                          className="h-8 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEmail(lead)}
                          className="h-8 text-xs"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Email
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCall(lead)}
                          className="h-8 text-xs"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLead(lead);
                            setQuotationItems([{ name: lead.item_name || '', quantity: 1, unit_price: lead.expected_value || 0 }]);
                            setShowQuotationModal(true);
                          }}
                          className="h-8 text-xs"
                        >
                          <FileSpreadsheet className="w-3 h-3 mr-1" />
                          Send Quotation
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                        {statusConfig.label}
                      </Badge>
                      <Badge variant="outline" className={priorityConfig.color}>
                        {priorityConfig.label}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </p>

                    <div className="flex items-center gap-2">
                      {!lead.is_unlocked && (
                        <Button
                          size="sm"
                          variant={canUnlock ? "default" : "outline"}
                          onClick={() => handleUnlock(lead)}
                          disabled={!canUnlock || unlocking === lead.id}
                          className="text-xs h-8"
                        >
                          {unlocking === lead.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Unlock className="w-3 h-3 mr-1" />
                          )}
                          Unlock ({creditsNeeded} credits)
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openLeadDetails(lead)}>
                            <FileText className="w-4 h-4 mr-2" />
                            View Full Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedLead(lead);
                            setShowFollowUpModal(true);
                          }}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Follow-up
                          </DropdownMenuItem>
                          {lead.is_unlocked && (
                            <>
                              <DropdownMenuItem onClick={() => handleStartChat(lead)}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Start Chat
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedLead(lead);
                                setQuotationItems([{ name: lead.item_name || '', quantity: 1, unit_price: lead.expected_value || 0 }]);
                                setShowQuotationModal(true);
                              }}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Send Quotation
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">Change Status</div>
                          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <DropdownMenuItem 
                              key={status}
                              onClick={() => handleStatusChange(lead.id, status as Lead['status'])}
                              disabled={lead.status === status}
                            >
                              <div className={`w-2 h-2 rounded-full ${config.bg} mr-2`} />
                              {config.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {lead.next_follow_up && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <Calendar className="w-3 h-3" />
                        Follow-up: {format(new Date(lead.next_follow_up), 'MMM d')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </TabsContent>
      </Tabs>

      {/* Lead Details Modal - Full CRM View */}
      <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Lead Details
              {selectedLead?.is_unlocked && (
                <Badge className="bg-green-100 text-green-700 ml-2">
                  <Unlock className="w-3 h-3 mr-1" />
                  Unlocked
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              {/* Buyer Information Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Buyer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedLead.is_unlocked ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-muted-foreground text-xs">Full Name</label>
                        <p className="font-medium">{selectedLead.buyer_name}</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground text-xs">Company</label>
                        <p className="font-medium">{selectedLead.buyer_company || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground text-xs">Phone Number</label>
                        <a href={`tel:${selectedLead.buyer_phone}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedLead.buyer_phone}
                        </a>
                      </div>
                      <div>
                        <label className="text-muted-foreground text-xs">Email Address</label>
                        <a href={`mailto:${selectedLead.buyer_email}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {selectedLead.buyer_email}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Unlock to view buyer details</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Information Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Product Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-muted-foreground text-xs">Product Name</label>
                      <p className="font-medium">{selectedLead.item_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">Type</label>
                      <Badge variant="outline" className="capitalize">{selectedLead.item_type}</Badge>
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">Status</label>
                      <Badge className={`${STATUS_CONFIG[selectedLead.status].bg} ${STATUS_CONFIG[selectedLead.status].color} border-0`}>
                        {STATUS_CONFIG[selectedLead.status].label}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">Expected Value</label>
                      <p className="font-medium">
                        {selectedLead.expected_value 
                          ? `₹${selectedLead.expected_value.toLocaleString()}`
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions for Unlocked Leads */}
              {selectedLead.is_unlocked && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => handleStartChat(selectedLead)} className="flex-1 min-w-[120px]">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Start Chat
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleWhatsApp(selectedLead)}
                        className="flex-1 min-w-[120px] bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button variant="outline" onClick={() => handleEmail(selectedLead)} className="flex-1 min-w-[120px]">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </Button>
                      <Button variant="outline" onClick={() => handleCall(selectedLead)} className="flex-1 min-w-[120px]">
                        <Phone className="w-4 h-4 mr-2" />
                        Call Now
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowLeadModal(false);
                          setQuotationItems([{ name: selectedLead.item_name || '', quantity: 1, unit_price: selectedLead.expected_value || 0 }]);
                          setShowQuotationModal(true);
                        }}
                        className="flex-1 min-w-[120px]"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Send Quotation
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowLeadModal(false);
                          setShowFollowUpModal(true);
                        }}
                        className="flex-1 min-w-[120px]"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Follow-up
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Activity History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Activity History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leadActivities.length > 0 ? (
                    <div className="space-y-3">
                      {leadActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 text-sm border-l-2 border-primary/20 pl-3">
                          <div className="flex-1">
                            <p className="font-medium">{activity.title}</p>
                            {activity.description && (
                              <p className="text-muted-foreground text-xs mt-1">{activity.description}</p>
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
                    <p className="text-muted-foreground text-sm text-center py-4">No activity recorded yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadModal(false)}>Close</Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Follow-up
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Follow-up Date</label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Add notes for this follow-up..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpModal(false)}>Cancel</Button>
            <Button onClick={handleScheduleFollowUp} disabled={!followUpDate}>
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotation Modal */}
      <Dialog open={showQuotationModal} onOpenChange={setShowQuotationModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Send Quotation
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><strong>To:</strong> {selectedLead.buyer_name}</p>
                <p><strong>Email:</strong> {selectedLead.buyer_email}</p>
                <p><strong>Product:</strong> {selectedLead.item_name}</p>
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

              <div className="bg-muted p-3 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{quotationItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>₹{(quotationItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0) * 0.18).toLocaleString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>₹{(quotationItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0) * 1.18).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={quotationNotes}
                  onChange={(e) => setQuotationNotes(e.target.value)}
                  placeholder="Additional notes for the quotation..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuotationModal(false)}>Cancel</Button>
            <Button onClick={handleSendQuotation} disabled={sendingQuotation}>
              {sendingQuotation ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsManager;