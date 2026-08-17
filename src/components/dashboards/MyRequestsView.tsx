import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Package, Bot, Wrench, Clock, CheckCircle, XCircle,
  FileText, MapPin, IndianRupee, User, Mail, Phone, MessageSquare,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserRequest {
  id: string;
  product_type: string;
  product_name: string;
  brand: string | null;
  specifications: string | null;
  quantity: number;
  budget: string | null;
  location: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RequestAssignment {
  id: string;
  request_id: string;
  seller_id: string;
  status: string;
  seller_notes: string | null;
  quotation_amount: number | null;
  quotation_details: string | null;
  product_details: string | null;
  response_at: string | null;
  created_at: string;
  seller_profile?: {
    full_name: string;
    company_name: string | null;
    email: string | null;
    mobile_number: string | null;
    location: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new_request: { label: "New", color: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary", icon: <Clock className="h-3 w-3" /> },
  seller_assigned: { label: "Seller Assigned", color: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary", icon: <User className="h-3 w-3" /> },
  quote_submitted: { label: "Quote Received", color: "bg-success/10 text-success dark:bg-success/30 dark:text-success", icon: <CheckCircle className="h-3 w-3" /> },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Completed", color: "bg-success/10 text-success dark:bg-success/30 dark:text-success", icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive", icon: <XCircle className="h-3 w-3" /> },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  robot: <Bot className="h-5 w-5 text-primary" />,
  spare_part: <Package className="h-5 w-5 text-primary" />,
  service: <Wrench className="h-5 w-5 text-primary" />,
};

const MyRequestsView = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
  const [assignments, setAssignments] = useState<RequestAssignment[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from("user_product_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setRequests((data || []) as unknown as UserRequest[]);
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const fetchAssignments = async (requestId: string) => {
    setLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from("request_assignments")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const enriched = await Promise.all(
        ((data || []) as any[]).map(async (a) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, company_name, email, mobile_number, location")
            .eq("user_id", a.seller_id)
            .single();
          return { ...a, seller_profile: profile || undefined } as RequestAssignment;
        })
      );
      setAssignments(enriched);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleViewDetails = (request: UserRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
    fetchAssignments(request.id);
  };

  const filteredRequests = requests.filter((r) =>
    r.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.product_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.brand || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">My Submitted Requests</h2>
          <p className="text-sm text-muted-foreground">
            Track your product/service requests and seller responses
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Send className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No requests submitted yet</p>
            <p className="text-sm">Submit a request from the Robots, Parts, or Services pages</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const status = STATUS_CONFIG[request.status] || STATUS_CONFIG.new_request;
            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        {TYPE_ICON[request.product_type] || <Package className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{request.product_name}</p>
                          <Badge className={status.color}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            {request.product_type.replace("_", " ")}
                          </Badge>
                        </div>
                        {request.brand && (
                          <p className="text-sm text-muted-foreground">Brand: {request.brand}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(request.created_at), "dd MMM yyyy")}
                          </span>
                          <span>Qty: {request.quantity}</span>
                          {request.budget && (
                            <span className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3" />
                              {request.budget}
                            </span>
                          )}
                          {request.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {request.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(request)}>
                      <FileText className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {TYPE_ICON[selectedRequest.product_type]}
                  {selectedRequest.product_name}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Request Details</TabsTrigger>
                  <TabsTrigger value="responses" className="flex-1">
                    Seller Responses ({assignments.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Product Type</p>
                      <p className="font-medium capitalize">{selectedRequest.product_type.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Quantity</p>
                      <p className="font-medium">{selectedRequest.quantity}</p>
                    </div>
                    {selectedRequest.brand && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium">Brand</p>
                        <p className="font-medium">{selectedRequest.brand}</p>
                      </div>
                    )}
                    {selectedRequest.budget && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium">Budget</p>
                        <p className="font-medium">{selectedRequest.budget}</p>
                      </div>
                    )}
                    {selectedRequest.location && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium">Location</p>
                        <p className="font-medium">{selectedRequest.location}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Status</p>
                      <Badge className={STATUS_CONFIG[selectedRequest.status]?.color || ""}>
                        {STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}
                      </Badge>
                    </div>
                  </div>
                  {selectedRequest.specifications && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Specifications</p>
                      <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">{selectedRequest.specifications}</p>
                    </div>
                  )}
                  {selectedRequest.admin_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Admin Notes</p>
                      <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedRequest.admin_notes}</p>
                    </div>
                  )}
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Your Contact Info</p>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> {selectedRequest.contact_name}</p>
                      <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {selectedRequest.contact_email}</p>
                      {selectedRequest.contact_phone && (
                        <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selectedRequest.contact_phone}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="responses" className="mt-4">
                  {loadingAssignments ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No seller responses yet</p>
                      <p className="text-sm">Sellers will respond once they review your request</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((assignment) => (
                        <Card key={assignment.id}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">
                                  {assignment.seller_profile?.company_name || assignment.seller_profile?.full_name || "Seller"}
                                </p>
                                {assignment.seller_profile?.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {assignment.seller_profile.location}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {assignment.status.replace("_", " ")}
                              </Badge>
                            </div>
                            {assignment.quotation_amount && (
                              <div className="bg-primary/5 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Quoted Price</p>
                                <p className="text-xl font-bold text-primary">
                                  ₹{assignment.quotation_amount.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {assignment.quotation_details && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Quote Details</p>
                                <p className="text-sm">{assignment.quotation_details}</p>
                              </div>
                            )}
                            {assignment.product_details && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Product Details</p>
                                <p className="text-sm">{assignment.product_details}</p>
                              </div>
                            )}
                            {assignment.seller_notes && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Seller Notes</p>
                                <p className="text-sm">{assignment.seller_notes}</p>
                              </div>
                            )}
                            {assignment.response_at && (
                              <p className="text-xs text-muted-foreground">
                                Responded: {format(new Date(assignment.response_at), "dd MMM yyyy, hh:mm a")}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyRequestsView;
