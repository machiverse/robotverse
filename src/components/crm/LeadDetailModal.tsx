import React, { useState, useEffect } from 'react';
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
  status:
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'quoted'
    | 'negotiating'
    | 'closed_won'
    | 'closed_lost';
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
  onSendQuotation?: (
    leadId: string,
    amount: number,
    message: string,
  ) => Promise<void>;
  onUpdateStatus?: (leadId: string, status: Lead['status']) => Promise<boolean>;
}

const STATUS_CONFIG: Record<
  Lead['status'],
  { label: string; color: string; bgColor: string }
> = {
  new: { label: 'New', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  contacted: {
    label: 'Contacted',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  qualified: {
    label: 'Qualified',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  quoted: {
    label: 'Quoted',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  negotiating: {
    label: 'Negotiating',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  closed_won: {
    label: 'Won',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
  },
  closed_lost: {
    label: 'Lost',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

const PRIORITY_CONFIG: Record<
  NonNullable<Lead['priority']>,
  { label: string; color: string }
> = {
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

  // keep notes in sync when lead changes
  useEffect(() => {
    setNotes(lead?.notes || '');
    setShowQuoteForm(false);
    setShowFollowUpForm(false);
    setQuoteAmount('');
    setQuoteMessage('');
    setFollowUpDate('');
    setIsEditingNotes(false);
    setIsSaving(false);
  }, [lead]);

  if (!lead) return null;

  const statusConfig = STATUS_CONFIG[lead.status];
  const priorityConfig =
    PRIORITY_CONFIG[lead.priority || 'medium'] || PRIORITY_CONFIG.medium;

  const handleWhatsApp = () => {
    if (lead.buyer_phone) {
      const phone = lead.buyer_phone.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(
        `Hello ${
          lead.buyer_name || 'there'
        },\n\nI'm reaching out regarding your interest in ${
          lead.item_name || 'our product'
        }.\n\nHow can I help you today?`,
      );
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (lead.buyer_email) {
      const subject = encodeURIComponent(
        `Regarding your inquiry – ${lead.item_name || 'Product'}`,
      );
      const body = encodeURIComponent(
        `Dear ${lead.buyer_name || 'Customer'},\n\nThank you for your interest in ${
          lead.item_name || 'our product'
        }.\n\nPlease let me know how I can assist you further.\n\nBest regards,\n`,
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
    if (!onUpdateNotes) return;
    setIsSaving(true);
    const success = await onUpdateNotes(lead.id, notes);
    setIsSaving(false);
    if (success) setIsEditingNotes(false);
  };

  const handleScheduleFollowUp = async () => {
    if (!onScheduleFollowUp || !followUpDate) return;
    setIsSaving(true);
    const success = await onScheduleFollowUp(lead.id, followUpDate);
    setIsSaving(false);
    if (success) {
      setShowFollowUpForm(false);
      setFollowUpDate('');
    }
  };

  const handleSendQuotationClick = async () => {
    if (!onSendQuotation || !quoteAmount) return;
    setIsSaving(true);
    await onSendQuotation(lead.id, parseFloat(quoteAmount), quoteMessage);
    setIsSaving(false);
    setShowQuoteForm(false);
    setQuoteAmount('');
    setQuoteMessage('');
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {lead.buyer_name || 'Anonymous lead'}
                  </span>
                  {lead.buyer_company && (
                    <span className="text-xs text-muted-foreground">
                      · {lead.buyer_company}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    className={`${statusConfig.bgColor} ${statusConfig.color} border-0 text-xs`}
                  >
                    {statusConfig.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${priorityConfig.color}`}
                  >
                    <Star className="mr-1 h-3 w-3" />
                    {priorityConfig.label} priority
                  </Badge>
                  {lead.item_name && (
                    <span className="text-xs text-muted-foreground">
                      • {lead.item_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Separator className="my-3" />

        {/* 2-column layout */}
        <div className="grid gap-4 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
          {/* LEFT COLUMN: profile, product, timeline */}
          <div className="space-y-4">
            {/* Contact information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4 text-primary" />
                  Contact summary
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Full name
                    </p>
                    <p className="font-medium">
                      {lead.buyer_name || 'Not provided'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Company
                    </p>
                    <p className="font-medium">
                      {lead.buyer_company || 'Not provided'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">Email</p>
                    <p className="truncate font-medium">
                      {lead.buyer_email || 'Not provided'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-[11px] text-muted-foreground">
                      Mobile number
                    </p>
                    <p className="font-medium">
                      {lead.buyer_phone || 'Not provided'}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Location
                    </p>
                    <p className="font-medium">
                      {lead.buyer_location || 'Not provided'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product & deal info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Package className="h-4 w-4 text-primary" />
                  Product & deal
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Item type
                    </p>
                    <p className="font-medium capitalize">
                      {lead.item_type?.replace('_', ' ') || 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Item name
                    </p>
                    <p className="font-medium">
                      {lead.item_name || 'Not specified'}
                    </p>
                  </div>
                </div>
                {lead.expected_value && (
                  <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        Expected value
                      </p>
                      <p className="font-medium">
                        ₹{lead.expected_value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Source
                    </p>
                    <p className="font-medium capitalize">
                      {lead.source || 'Direct'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-primary" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-3">
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Lead created
                    </p>
                    <p className="text-xs font-medium">
                      {formatDateTime(lead.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Last contacted
                    </p>
                    <p className="text-xs font-medium">
                      {formatDateTime(lead.last_contacted_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Next follow-up
                    </p>
                    <p className="text-xs font-medium">
                      {formatDateTime(lead.next_follow_up)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: actions, notes, status */}
          <div className="space-y-4">
            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-primary" />
                  Quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-200 text-green-600 hover:bg-green-50"
                    onClick={handleWhatsApp}
                    disabled={!lead.buyer_phone}
                  >
                    <FaWhatsapp className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCall}
                    disabled={!lead.buyer_phone}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEmail}
                    disabled={!lead.buyer_email}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowQuoteForm((v) => !v)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Send quotation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFollowUpForm((v) => !v)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule follow-up
                  </Button>
                </div>

                {showQuoteForm && (
                  <div className="mt-3 space-y-3 rounded-md border p-3">
                    <h4 className="text-sm font-medium">Quotation details</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Amount (₹)</Label>
                        <Input
                          type="number"
                          value={quoteAmount}
                          onChange={(e) => setQuoteAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Message (optional)</Label>
                        <Input
                          value={quoteMessage}
                          onChange={(e) => setQuoteMessage(e.target.value)}
                          placeholder="Short note to include"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSendQuotationClick}
                        disabled={!quoteAmount || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Send
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowQuoteForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {showFollowUpForm && (
                  <div className="mt-3 space-y-3 rounded-md border p-3">
                    <h4 className="text-sm font-medium">Follow-up</h4>
                    <div className="space-y-1">
                      <Label className="text-xs">Date & time</Label>
                      <Input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleScheduleFollowUp}
                        disabled={!followUpDate || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Calendar className="mr-2 h-4 w-4" />
                        )}
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFollowUpForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-primary" />
                    Internal notes
                  </CardTitle>
                  {onUpdateNotes && !isEditingNotes && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  )}
                  {onUpdateNotes && isEditingNotes && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleSaveNotes}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="mr-1 h-3 w-3" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setIsEditingNotes(false);
                          setNotes(lead.notes || '');
                        }}
                      >
                        <X className="h-3 w-3" />
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
                    placeholder="Capture context, objections, and next steps for this lead…"
                    className="min-h-[110px] text-sm"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {lead.notes ||
                      'No notes added yet. Use notes to capture qualification details, objections, and key decision makers.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Status update */}
            {onUpdateStatus && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Update status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(
                      Object.keys(STATUS_CONFIG) as Array<Lead['status']>
                    ).map((statusKey) => {
                      const cfg = STATUS_CONFIG[statusKey];
                      const active = lead.status === statusKey;
                      return (
                        <Button
                          key={statusKey}
                          size="sm"
                          variant={active ? 'default' : 'outline'}
                          className={
                            active
                              ? 'h-7 text-xs'
                              : `h-7 border-0 text-xs ${cfg.color} ${cfg.bgColor}`
                          }
                          onClick={() => onUpdateStatus(lead.id, statusKey)}
                        >
                          {cfg.label}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailModal;
