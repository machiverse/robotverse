import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Calendar,
  Clock,
  Tag,
  Package,
  DollarSign,
  Edit,
  Save,
  X,
  Send,
  FileText,
  Activity,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

interface Lead {
  id: string;
  buyer_id?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  buyer_company?: string;
  buyer_location?: string;
  item_id?: string;
  item_type: string;
  item_name?: string;
  status: 'new' | 'contacted' | 'qualified' | 'quoted' | 'negotiating' | 'closed_won' | 'closed_lost';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  notes?: string;
  expected_value?: number;
  currency?: string;
  next_follow_up?: string;
  last_contacted_at?: string;
  created_at: string;
  is_unlocked?: boolean;
  tags?: string[];
}

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNotes?: (leadId: string, notes: string) => Promise<boolean>;
  onScheduleFollowUp?: (leadId: string, date: string) => Promise<boolean>;
  onSendQuotation?: (leadId: string, amount: number, message: string) => Promise<void>;
  onUpdateStatus?: (leadId: string, status: Lead['status']) => Promise<boolean>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  contacted: { label: 'Contacted', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  qualified: { label: 'Qualified', color: 'text-green-700', bgColor: 'bg-green-100' },
  quoted: { label: 'Quoted', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  negotiating: { label: 'Negotiating', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  closed_won: { label: 'Won', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  closed_lost: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-600' },
  medium: { label: 'Medium', color: 'text-blue-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
};

const LeadDetailModal = ({
  lead,
  isOpen,
  onClose,
  onUpdateNotes,
  onScheduleFollowUp,
  onSendQuotation,
  onUpdateStatus,
}: LeadDetailModalProps) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lead?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  if (!lead) return null;

  const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const priorityConfig = PRIORITY_CONFIG[lead.priority || 'medium'];

  const handleWhatsApp = () => {
    if (lead.buyer_phone) {
      const phone = lead.buyer_phone.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(
        `Hello ${lead.buyer_name || 'there'}! I'm reaching out regarding your interest in ${lead.item_name || 'our product'}. How can I help you today?`
      );
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (lead.buyer_email) {
      const subject = encodeURIComponent(`Regarding your inquiry - ${lead.item_name || 'Product'}`);
      const body = encodeURIComponent(
        `Dear ${lead.buyer_name || 'Customer'},\n\nThank you for your interest in ${lead.item_name || 'our product'}.\n\nPlease let me know how I can assist you.\n\nBest regards`
      );
      window.open(`mailto:${lead.buyer_email}?subject=${subject}&body=${body}`);
    }
  };

  const handleCall = () => {
    if (lead.buyer_phone) {
      window.open(`tel:${lead.buyer_phone}`);
    }
  };

  const handleSaveNotes = async () => {
    if (onUpdateNotes) {
      setIsSaving(true);
      const success = await onUpdateNotes(lead.id, notes);
      setIsSaving(false);
      if (success) {
        setIsEditingNotes(false);
      }
    }
  };

  const handleScheduleFollowUp = async () => {
    if (onScheduleFollowUp && followUpDate) {
      setIsSaving(true);
      const success = await onScheduleFollowUp(lead.id, followUpDate);
      setIsSaving(false);
      if (success) {
        setShowFollowUpForm(false);
        setFollowUpDate('');
      }
    }
  };

  const handleSendQuotation = async () => {
    if (onSendQuotation && quoteAmount) {
      setIsSaving(true);
      await onSendQuotation(lead.id, parseFloat(quoteAmount), quoteMessage);
      setIsSaving(false);
      setShowQuoteForm(false);
      setQuoteAmount('');
      setQuoteMessage('');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold">{lead.buyer_name || 'Anonymous Lead'}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className={priorityConfig.color}>
                  <Star className="w-3 h-3 mr-1" />
                  {priorityConfig.label} Priority
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contact Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{lead.buyer_name || 'Not provided'}</p>
                </div>
              </div>

              {/* Company */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">{lead.buyer_company || 'Not provided'}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{lead.buyer_email || 'Not provided'}</p>
                </div>
                {lead.buyer_email && (
                  <Button size="sm" variant="ghost" onClick={handleEmail}>
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Mobile Number</p>
                  <p className="font-medium">{lead.buyer_phone || 'Not provided'}</p>
                </div>
                {lead.buyer_phone && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={handleCall}>
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-green-600" onClick={handleWhatsApp}>
                      <FaWhatsapp className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg md:col-span-2">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{lead.buyer_location || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={handleWhatsApp}
                  disabled={!lead.buyer_phone}
                >
                  <FaWhatsapp className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCall}
                  disabled={!lead.buyer_phone}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEmail}
                  disabled={!lead.buyer_email}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQuoteForm(!showQuoteForm)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Send Quotation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Follow-up
                </Button>
              </div>

              {/* Quote Form */}
              {showQuoteForm && (
                <div className="mt-4 p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium">Send Quotation</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Amount (₹)</Label>
                      <Input
                        type="number"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Input
                        value={quoteMessage}
                        onChange={(e) => setQuoteMessage(e.target.value)}
                        placeholder="Optional message"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSendQuotation} disabled={!quoteAmount || isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Send
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowQuoteForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Follow-up Form */}
              {showFollowUpForm && (
                <div className="mt-4 p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium">Schedule Follow-up</h4>
                  <div>
                    <Label>Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleScheduleFollowUp} disabled={!followUpDate || isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                      Schedule
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowFollowUpForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Interest */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Product Interest
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Tag className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Item Type</p>
                  <p className="font-medium capitalize">{lead.item_type?.replace('_', ' ') || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Package className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Item Name</p>
                  <p className="font-medium">{lead.item_name || 'Not specified'}</p>
                </div>
              </div>
              {lead.expected_value && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Value</p>
                    <p className="font-medium">₹{lead.expected_value.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium capitalize">{lead.source || 'Direct'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead Created</p>
                  <p className="font-medium text-sm">{formatDate(lead.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Contacted</p>
                  <p className="font-medium text-sm">{formatDate(lead.last_contacted_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Next Follow-up</p>
                  <p className="font-medium text-sm">{formatDate(lead.next_follow_up)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Notes
                </CardTitle>
                {!isEditingNotes ? (
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingNotes(true)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setIsEditingNotes(false);
                      setNotes(lead.notes || '');
                    }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  className="min-h-[100px]"
                />
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {lead.notes || 'No notes added yet. Click Edit to add notes.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status Update */}
          {onUpdateStatus && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Update Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={lead.status === status ? 'default' : 'outline'}
                      className={lead.status === status ? '' : `${config.color} ${config.bgColor} border-0`}
                      onClick={() => onUpdateStatus(lead.id, status as Lead['status'])}
                    >
                      {config.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailModal;
