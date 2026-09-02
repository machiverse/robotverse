import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Send, User, Building2, Mail, Phone, Package, Clock, TrendingUp, CheckCircle, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface QuoteRequest {
  id: string;
  user_id: string;
  seller_id: string;
  request_type: string;
  item_type: string;
  item_id: string | null;
  item_name: string;
  user_name: string;
  company_name: string;
  mobile_number: string;
  email_address: string;
  location: string;
  requirements: string;
  urgency: string;
  status: string;
  created_at: string;
  seller_name?: string;
  seller_company?: string;
  seller_email?: string;
}

interface Quotation {
  id: string;
  quotation_number: string;
  seller_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_company: string;
  total_amount: number;
  status: string;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  revision_history: any;
  items: any;
  seller_name?: string;
  seller_company?: string;
}

const AdminQuoteMonitoring = () => {
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsRes, quotationsRes, profilesRes] = await Promise.all([
        supabase.from('user_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_quotations').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, full_name, company_name, email, mobile_number')
      ]);

      const profileMap: Record<string, any> = {};
      profilesRes.data?.forEach(p => { profileMap[p.user_id] = p; });
      setProfiles(profileMap);

      if (requestsRes.data) {
        const enriched = requestsRes.data.map(r => ({
          ...r,
          seller_name: profileMap[r.seller_id]?.full_name || 'Unknown',
          seller_company: profileMap[r.seller_id]?.company_name || '-',
          seller_email: profileMap[r.seller_id]?.email || '-',
        }));
        setQuoteRequests(enriched);
      }

      if (quotationsRes.data) {
        const enriched = quotationsRes.data.map(q => ({
          ...q,
          seller_name: profileMap[q.seller_id]?.full_name || 'Unknown',
          seller_company: profileMap[q.seller_id]?.company_name || '-',
        }));
        setQuotations(enriched);
      }
    } catch (error) {
      console.error('Error fetching quote data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-muted text-muted-foreground',
      sent: 'bg-primary/10 text-primary',
      viewed: 'bg-primary/10 text-primary',
      accepted: 'bg-success/10 text-success',
      rejected: 'bg-red-100 text-red-800',
      responded: 'bg-success/10 text-success',
      negotiation: 'bg-amber-100 text-amber-800',
    };
    return (
      <Badge className={variants[status] || 'bg-muted text-muted-foreground'}>
        {status}
      </Badge>
    );
  };

  const totalRequests = quoteRequests.length;
  const pendingRequests = quoteRequests.filter(r => r.status === 'pending').length;
  const respondedRequests = quoteRequests.filter(r => r.status === 'responded').length;
  const totalQuotations = quotations.length;
  const acceptedQuotations = quotations.filter(q => q.status === 'accepted').length;
  const rejectedQuotations = quotations.filter(q => q.status === 'rejected').length;
  const negotiationQuotations = quotations.filter(q => q.status === 'negotiation').length;
  const totalQuoteValue = quotations.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quote & Quotation Monitoring</h2>
          <p className="text-muted-foreground">Track all quote requests and seller quotations across the platform</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Send className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{totalRequests}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
            <p className="text-2xl font-bold">{pendingRequests}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-success mb-1" />
            <p className="text-2xl font-bold">{respondedRequests}</p>
            <p className="text-xs text-muted-foreground">Responded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{totalQuotations}</p>
            <p className="text-xs text-muted-foreground">Quotations Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-success mb-1" />
            <p className="text-2xl font-bold">{acceptedQuotations}</p>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
            <p className="text-2xl font-bold">{rejectedQuotations}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-3 text-center">
            <FileText className="h-5 w-5 mx-auto text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{negotiationQuotations}</p>
            <p className="text-xs text-muted-foreground">Negotiation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">₹{(totalQuoteValue / 100000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Quote Requests ({totalRequests})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations Sent ({totalQuotations})</TabsTrigger>
          <TabsTrigger value="negotiations">Negotiations ({negotiationQuotations})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({acceptedQuotations})</TabsTrigger>
        </TabsList>

        {/* Quote Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Quote Requests — Buyer → Seller</CardTitle>
            </CardHeader>
            <CardContent>
              {quoteRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No quote requests found</p>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Buyer (Sender)</TableHead>
                        <TableHead>Seller (Receiver)</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteRequests.map(req => (
                        <TableRow key={req.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(req.created_at), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium text-sm">{req.user_name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {req.company_name || '-'}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {req.email_address || '-'}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {req.mobile_number || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-primary" />
                                <span className="font-medium text-sm">{req.seller_name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {req.seller_company}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {req.seller_email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{req.item_name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{req.item_type || req.request_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={req.urgency === 'urgent' ? 'destructive' : 'outline'} className="text-xs">
                              {req.urgency || 'normal'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotations Sent Tab */}
        <TabsContent value="quotations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seller Quotations Submitted to Buyers</CardTitle>
            </CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No quotations found</p>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Seller (Sender)</TableHead>
                        <TableHead>Buyer (Receiver)</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Timeline</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotations.map(q => (
                        <TableRow key={q.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(q.created_at), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm font-medium">{q.quotation_number}</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-primary" />
                                <span className="font-medium text-sm">{q.seller_name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {q.seller_company}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium text-sm">{q.buyer_name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {q.buyer_company || '-'}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {q.buyer_email || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-primary">₹{Number(q.total_amount).toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-xs">
                              {q.sent_at && (
                                <div className="flex items-center gap-1 text-primary">
                                  <Send className="h-3 w-3" /> Sent {format(new Date(q.sent_at), 'dd MMM')}
                                </div>
                              )}
                              {q.viewed_at && (
                                <div className="flex items-center gap-1 text-primary">
                                  <Eye className="h-3 w-3" /> Viewed {format(new Date(q.viewed_at), 'dd MMM')}
                                </div>
                              )}
                              {q.accepted_at && (
                                <div className="flex items-center gap-1 text-success">
                                  <CheckCircle className="h-3 w-3" /> Accepted {format(new Date(q.accepted_at), 'dd MMM')}
                                </div>
                              )}
                              {q.rejected_at && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-3 w-3" /> Rejected {format(new Date(q.rejected_at), 'dd MMM')}
                                </div>
                              )}
                {/* Show negotiation note if status is negotiation */}
                {q.status === 'negotiation' && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <FileText className="h-3 w-3" /> Negotiation requested
                  </div>
                )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(q.status || 'draft')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Negotiations Tab */}
        <TabsContent value="negotiations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quotations Under Negotiation</CardTitle>
            </CardHeader>
            <CardContent>
              {quotations.filter(q => q.status === 'negotiation').length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No quotations under negotiation</p>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Seller (Sender)</TableHead>
                        <TableHead>Buyer (Requester)</TableHead>
                        <TableHead>Original Amount</TableHead>
                        <TableHead>Proposed Price</TableHead>
                        <TableHead>Negotiation Details</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotations.filter(q => q.status === 'negotiation').map(q => {
                        const history = Array.isArray(q.revision_history) ? q.revision_history : [];
                        const lastNegotiation = history.filter((h: any) => h.action === 'buyer_negotiation').pop();
                        return (
                          <TableRow key={q.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(q.created_at), 'dd MMM yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm font-medium">{q.quotation_number}</span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-primary" />
                                  <span className="font-medium text-sm">{q.seller_name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  {q.seller_company}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium text-sm">{q.buyer_name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  {q.buyer_company || '-'}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {q.buyer_email || '-'}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {q.buyer_phone || '-'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-primary">₹{Number(q.total_amount).toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                              {lastNegotiation?.proposed_price ? (
                                <span className="font-semibold text-amber-600">₹{Number(lastNegotiation.proposed_price).toLocaleString()}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">No price proposed</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px] space-y-1">
                                {lastNegotiation?.message && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">"{lastNegotiation.message}"</p>
                                )}
                                {lastNegotiation?.timestamp && (
                                  <p className="text-xs text-amber-600">
                                    {format(new Date(lastNegotiation.timestamp), 'dd MMM yyyy HH:mm')}
                                  </p>
                                )}
                                {q.rejection_reason && !lastNegotiation?.message && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">"{q.rejection_reason}"</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge('negotiation')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accepted Tab */}
        <TabsContent value="accepted">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accepted Quotations</CardTitle>
            </CardHeader>
            <CardContent>
              {quotations.filter(q => q.status === 'accepted').length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No accepted quotations</p>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Seller (Sender)</TableHead>
                        <TableHead>Buyer (Receiver)</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Timeline</TableHead>
                        <TableHead>Accepted On</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotations.filter(q => q.status === 'accepted').map(q => (
                        <TableRow key={q.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(q.created_at), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm font-medium">{q.quotation_number}</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-primary" />
                                <span className="font-medium text-sm">{q.seller_name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {q.seller_company}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium text-sm">{q.buyer_name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {q.buyer_company || '-'}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {q.buyer_email || '-'}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {q.buyer_phone || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-primary">₹{Number(q.total_amount).toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-xs">
                              {q.sent_at && (
                                <div className="flex items-center gap-1 text-primary">
                                  <Send className="h-3 w-3" /> Sent {format(new Date(q.sent_at), 'dd MMM')}
                                </div>
                              )}
                              {q.viewed_at && (
                                <div className="flex items-center gap-1 text-primary">
                                  <Eye className="h-3 w-3" /> Viewed {format(new Date(q.viewed_at), 'dd MMM')}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {q.accepted_at ? (
                              <div className="flex items-center gap-1 text-success font-medium">
                                <CheckCircle className="h-3 w-3" />
                                {format(new Date(q.accepted_at), 'dd MMM yyyy HH:mm')}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge('accepted')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminQuoteMonitoring;
