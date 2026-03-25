import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSellerAssignments } from '@/hooks/useUserProductRequests';
import {
  Bot, Package, Wrench, Send, Eye, Loader2, MessageSquare, CheckCircle,
  Clock, User, Mail, Phone, MapPin, IndianRupee, Hash, FileText,
  Calendar, Building, RefreshCw, Inbox, ArrowRight, Sparkles, AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SellerAssignedRequestsProps {
  categoryFilter?: 'robot' | 'spare_part' | 'service';
}

const TYPE_CONFIG = {
  robot: { icon: Bot, label: 'Robot', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-l-blue-500' },
  spare_part: { icon: Package, label: 'Spare Part', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-l-emerald-500' },
  service: { icon: Wrench, label: 'Service', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-l-purple-500' },
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; color: string }> = {
  pending: { label: 'Pending Review', variant: 'secondary', icon: Clock, color: 'text-amber-600' },
  accepted: { label: 'Accepted', variant: 'outline', icon: CheckCircle, color: 'text-blue-600' },
  quote_submitted: { label: 'Quote Sent', variant: 'default', icon: Send, color: 'text-emerald-600' },
  declined: { label: 'Declined', variant: 'destructive', icon: AlertCircle, color: 'text-destructive' },
};

const SellerAssignedRequests = ({ categoryFilter }: SellerAssignedRequestsProps) => {
  const { myAssignments, loading, fetchMyAssignments, respondToAssignment } = useSellerAssignments();
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [responseForm, setResponseForm] = useState({
    quotation_amount: '',
    quotation_details: '',
    product_details: '',
    seller_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchMyAssignments(); }, [fetchMyAssignments]);

  const filtered = categoryFilter
    ? myAssignments.filter(a => a.request?.product_type === categoryFilter)
    : myAssignments;

  const tabFiltered = activeTab === 'all'
    ? filtered
    : filtered.filter(a => a.status === activeTab);

  const counts = {
    all: filtered.length,
    pending: filtered.filter(a => a.status === 'pending').length,
    accepted: filtered.filter(a => a.status === 'accepted').length,
    quote_submitted: filtered.filter(a => a.status === 'quote_submitted').length,
  };

  const openResponseModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setResponseForm({
      quotation_amount: assignment.quotation_amount?.toString() || '',
      quotation_details: assignment.quotation_details || '',
      product_details: assignment.product_details || '',
      seller_notes: assignment.seller_notes || '',
    });
    setShowResponseModal(true);
  };

  const openDetailModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setShowDetailModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedAssignment) return;
    setSubmitting(true);
    await respondToAssignment(selectedAssignment.id, {
      status: 'quote_submitted',
      seller_notes: responseForm.seller_notes,
      quotation_amount: parseFloat(responseForm.quotation_amount) || undefined,
      quotation_details: responseForm.quotation_details,
      product_details: responseForm.product_details,
    });
    setSubmitting(false);
    setShowResponseModal(false);
    fetchMyAssignments();
  };

  const handleAccept = async (assignmentId: string) => {
    await respondToAssignment(assignmentId, { status: 'accepted' });
    fetchMyAssignments();
  };

  const handleDecline = async (assignmentId: string) => {
    await respondToAssignment(assignmentId, { status: 'declined' });
    fetchMyAssignments();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading assigned requests…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            User Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Requests assigned to you by the platform. Review and submit quotations.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMyAssignments} className="w-fit">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Requests', value: counts.all, icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Pending Review', value: counts.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Accepted', value: counts.accepted, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Quotes Sent', value: counts.quote_submitted, icon: Send, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
        ].map(stat => (
          <Card key={stat.label} className="border-muted/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content with tabs */}
      <Card className="border-muted/70 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b bg-muted/30 pb-0">
            <TabsList className="h-auto justify-start gap-2 bg-transparent p-0">
              {[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'pending', label: 'Pending', count: counts.pending },
                { value: 'accepted', label: 'Accepted', count: counts.accepted },
                { value: 'quote_submitted', label: 'Quoted', count: counts.quote_submitted },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-4 py-2.5 text-sm font-medium data-[state=active]:bg-transparent rounded-none"
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[11px]">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardHeader>

          <CardContent className="p-0">
            {tabFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Inbox className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground">No requests found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {activeTab === 'all'
                    ? 'No user requests have been assigned to you yet. Check back later.'
                    : `No requests with "${activeTab}" status.`}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {tabFiltered.map(a => {
                  const r = a.request;
                  if (!r) return null;
                  const typeConf = TYPE_CONFIG[r.product_type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.robot;
                  const statusConf = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
                  const TypeIcon = typeConf.icon;
                  const StatusIcon = statusConf.icon;

                  return (
                    <div
                      key={a.id}
                      className={`group p-5 hover:bg-muted/30 transition-colors border-l-4 ${typeConf.border}`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        {/* Left: Request info */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Top row: title + badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">{r.product_name}</h3>
                            <Badge variant="outline" className={`flex items-center gap-1 text-xs ${typeConf.color}`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeConf.label}
                            </Badge>
                            <Badge variant={statusConf.variant} className="flex items-center gap-1 text-xs">
                              <StatusIcon className="w-3 h-3" />
                              {statusConf.label}
                            </Badge>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{r.contact_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{r.contact_email}</span>
                            </div>
                            {r.contact_phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                <span>{r.contact_phone}</span>
                              </div>
                            )}
                            {r.location && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{r.location}</span>
                              </div>
                            )}
                            {r.brand && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building className="w-3.5 h-3.5 shrink-0" />
                                <span>Brand: {r.brand}</span>
                              </div>
                            )}
                            {r.budget && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                                <span>{r.budget}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Hash className="w-3.5 h-3.5 shrink-0" />
                              <span>Qty: {r.quantity}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>

                          {/* Specifications preview */}
                          {r.specifications && (
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 line-clamp-2">
                              <FileText className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                              {r.specifications}
                            </p>
                          )}

                          {/* Quote info if already submitted */}
                          {a.status === 'quote_submitted' && a.quotation_amount && (
                            <div className="flex items-center gap-3 text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded-md px-3 py-2 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                Quoted: ₹{Number(a.quotation_amount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetailModal(a)}
                            className="text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                          </Button>

                          {a.status === 'pending' && (
                            <>
                              <Button size="sm" onClick={() => handleAccept(a.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDecline(a.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                                Decline
                              </Button>
                            </>
                          )}
                          {(a.status === 'accepted' || a.status === 'pending') && (
                            <Button size="sm" onClick={() => openResponseModal(a)}>
                              <Send className="w-3.5 h-3.5 mr-1" /> Submit Quote
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedAssignment?.request && (() => {
            const r = selectedAssignment.request;
            const typeConf = TYPE_CONFIG[r.product_type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.robot;
            const TypeIcon = typeConf.icon;
            return (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-lg ${typeConf.bg}`}>
                  <div className={`rounded-lg p-2.5 bg-background shadow-sm`}>
                    <TypeIcon className={`w-6 h-6 ${typeConf.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{r.product_name}</h3>
                    <p className="text-sm text-muted-foreground">{typeConf.label} • Qty: {r.quantity}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {r.brand && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground uppercase font-medium">Brand</p>
                      <p className="font-medium">{r.brand}</p>
                    </div>
                  )}
                  {r.budget && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground uppercase font-medium">Budget</p>
                      <p className="font-medium">{r.budget}</p>
                    </div>
                  )}
                  {r.location && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground uppercase font-medium">Location</p>
                      <p className="font-medium">{r.location}</p>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Submitted</p>
                    <p className="font-medium">{format(new Date(r.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                </div>

                {r.specifications && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Specifications</p>
                    <p className="text-sm bg-muted/50 rounded-md p-3">{r.specifications}</p>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-medium">Contact Information</p>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{r.contact_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${r.contact_email}`} className="text-primary hover:underline">{r.contact_email}</a>
                    </div>
                    {r.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${r.contact_phone}`} className="text-primary hover:underline">{r.contact_phone}</a>
                      </div>
                    )}
                  </div>
                </div>

                {selectedAssignment.status !== 'quote_submitted' && selectedAssignment.status !== 'declined' && (
                  <div className="pt-2">
                    <Button className="w-full" onClick={() => { setShowDetailModal(false); openResponseModal(selectedAssignment); }}>
                      <Send className="w-4 h-4 mr-2" /> Submit Quotation
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Response / Quote Modal */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Submit Quotation
            </DialogTitle>
            <DialogDescription>
              Provide your pricing and solution details for this request.
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment?.request && (
            <div className="space-y-5">
              {/* Request summary */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <div className="shrink-0">
                  {(() => {
                    const conf = TYPE_CONFIG[selectedAssignment.request.product_type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.robot;
                    const Icon = conf.icon;
                    return <Icon className={`w-5 h-5 ${conf.color}`} />;
                  })()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{selectedAssignment.request.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedAssignment.request.contact_name} • {selectedAssignment.request.location || 'No location'}
                    {selectedAssignment.request.budget && ` • Budget: ${selectedAssignment.request.budget}`}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Quotation Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={responseForm.quotation_amount}
                    onChange={e => setResponseForm(p => ({ ...p, quotation_amount: e.target.value }))}
                    placeholder="Enter your quotation amount"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Quotation Breakdown</Label>
                  <Textarea
                    value={responseForm.quotation_details}
                    onChange={e => setResponseForm(p => ({ ...p, quotation_details: e.target.value }))}
                    placeholder="Price breakdown, terms, delivery timeline, warranty…"
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Product / Solution Details</Label>
                  <Textarea
                    value={responseForm.product_details}
                    onChange={e => setResponseForm(p => ({ ...p, product_details: e.target.value }))}
                    placeholder="Product specifications, alternatives, availability…"
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Additional Notes</Label>
                  <Textarea
                    value={responseForm.seller_notes}
                    onChange={e => setResponseForm(p => ({ ...p, seller_notes: e.target.value }))}
                    placeholder="Any other notes for the buyer…"
                    rows={2}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResponseModal(false)}>Cancel</Button>
            <Button onClick={handleSubmitResponse} disabled={submitting || !responseForm.quotation_amount}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerAssignedRequests;
