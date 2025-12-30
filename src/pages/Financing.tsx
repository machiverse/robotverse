import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useButtonTracking } from "@/hooks/useButtonTracking";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useAutoSEO } from "@/hooks/useAutoSEO";
import { AutoSEOHead } from "@/components/SEO/AutoSEOHead";
import EnhancedHeader from "@/components/EnhancedHeader";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Search, CreditCard, Phone, Mail, MapPin, Clock, FileText, Calculator } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FinanceProvider {
  id: string;
  product_name: string;
  description: string;
  loan_type: string[];
  min_amount: number;
  max_amount: number;
  min_interest_rate: number;
  max_interest_rate: number;
  min_tenure_months: number;
  max_tenure_months: number;
  processing_fee_percentage: number;
  quick_approval: boolean;
  digital_process: boolean;
  collateral_required: boolean;
  provider_id: string;
  provider?: {
    full_name: string;
    company_name: string;
    location: string;
    phone: string;
    email: string;
  };
}

const Financing = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackButtonClick } = useButtonTracking();
  const { trackItemView } = useUniversalViewTracking();
  const { seoData } = useAutoSEO({ type: 'financing' });
  const [providers, setProviders] = useState<FinanceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<FinanceProvider | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  // Read filter from URL params
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam) {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchFinanceProviders();
  }, []);

  const fetchFinanceProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("loan_products")
        .select(`
          *,
          provider:provider_id (
            full_name,
            company_name,
            location,
            phone,
            email
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error("Error fetching finance providers:", error);
      toast({
        title: "Error",
        description: "Failed to load finance providers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = 
      provider.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.loan_type.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === "all" ||
      provider.loan_type.some(type => type.toLowerCase().includes(selectedType.toLowerCase()));

    return matchesSearch && matchesType;
  });

  const handleViewContact = (provider: FinanceProvider) => {
    // Track view contact interaction
    trackButtonClick({
      buttonName: "View Contact",
      buttonType: "finance_contact",
      sellerId: provider.provider_id,
      sellerName: provider.provider?.full_name,
      sellerCompany: provider.provider?.company_name,
      sellerEmail: provider.provider?.email,
      sellerMobile: provider.provider?.phone,
      sellerLocation: provider.provider?.location,
      itemId: provider.id,
      itemType: "financing",
      additionalData: {
        productName: provider.product_name,
        loanTypes: provider.loan_type,
        minAmount: provider.min_amount,
        maxAmount: provider.max_amount,
        interestRate: `${provider.min_interest_rate}%-${provider.max_interest_rate}%`
      }
    });

    setSelectedProvider(provider);
    setShowContactModal(true);
  };

  const handleApplyNow = (provider: FinanceProvider) => {
    // Track apply now interaction
    trackButtonClick({
      buttonName: "Apply Now",
      buttonType: "finance_application",
      sellerId: provider.provider_id,
      sellerName: provider.provider?.full_name,
      sellerCompany: provider.provider?.company_name,
      sellerEmail: provider.provider?.email,
      sellerMobile: provider.provider?.phone,
      sellerLocation: provider.provider?.location,
      itemId: provider.id,
      itemType: "financing",
      additionalData: {
        productName: provider.product_name,
        loanTypes: provider.loan_type,
        minAmount: provider.min_amount,
        maxAmount: provider.max_amount
      }
    });

    setSelectedProvider(provider);
    setShowApplicationModal(true);
  };

  const handleCallProvider = (provider: FinanceProvider) => {
    // Track call provider interaction
    trackButtonClick({
      buttonName: "Call Provider",
      buttonType: "finance_call",
      sellerId: provider.provider_id,
      sellerName: provider.provider?.full_name,
      sellerCompany: provider.provider?.company_name,
      sellerEmail: provider.provider?.email,
      sellerMobile: provider.provider?.phone,
      sellerLocation: provider.provider?.location,
      itemId: provider.id,
      itemType: "financing",
      additionalData: {
        productName: provider.product_name,
        contactMethod: "phone"
      }
    });

    setSelectedProvider(provider);
    setShowCallModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const ApplicationForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Full Name</label>
          <Input placeholder="Enter your full name" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <Input type="email" placeholder="your.email@example.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Phone Number</label>
          <Input placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Loan Amount</label>
          <Input type="number" placeholder="Enter amount" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Business Type</label>
        <Input placeholder="e.g., Manufacturing, Services, etc." />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Monthly Income</label>
        <Input type="number" placeholder="Enter monthly income" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Purpose of Loan</label>
        <textarea 
          className="w-full p-2 border rounded-md resize-none"
          rows={3}
          placeholder="Describe how you plan to use this financing..."
        />
      </div>
      <Button className="w-full">
        Submit Application
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {seoData && (
        <AutoSEOHead
          title={seoData.title}
          description={seoData.description}
          keywords={seoData.keywords}
          ogTitle={seoData.ogTitle}
          ogDescription={seoData.ogDescription}
          twitterCard={seoData.twitterCard}
          canonicalUrl={seoData.canonicalUrl}
          schemaMarkup={seoData.schemaMarkup}
        />
      )}
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Flexible Robot Financing</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Make your automation dreams affordable with customized financing solutions from trusted partners
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Loan Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Business Loan">Business Loan</SelectItem>
                <SelectItem value="Equipment Finance">Equipment Finance</SelectItem>
                <SelectItem value="Working Capital">Working Capital</SelectItem>
                <SelectItem value="Invoice Financing">Invoice Financing</SelectItem>
                <SelectItem value="Term Loan">Term Loan</SelectItem>
                <SelectItem value="MSME Loan">MSME Loan</SelectItem>
                <SelectItem value="Startup Funding">Startup Funding</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search financing options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <Card 
                key={provider.id} 
                className="h-full flex flex-col cursor-pointer hover:shadow-lg transition-all"
                onClick={() => trackItemView('loan_products', provider.id, provider)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {provider.product_name}
                  </CardTitle>
                  <CardDescription>
                    {provider.provider?.company_name || provider.provider?.full_name}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground mb-4">
                    {provider.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Amount Range:</span>
                        <div className="text-muted-foreground">
                          {formatCurrency(provider.min_amount)} - {formatCurrency(provider.max_amount)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Interest Rate:</span>
                        <div className="text-muted-foreground">
                          {provider.min_interest_rate}% - {provider.max_interest_rate}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Tenure:</span>
                        <div className="text-muted-foreground">
                          {provider.min_tenure_months} - {provider.max_tenure_months} months
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Processing Fee:</span>
                        <div className="text-muted-foreground">
                          {provider.processing_fee_percentage}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {provider.quick_approval && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Quick Approval
                        </Badge>
                      )}
                      {provider.digital_process && (
                        <Badge variant="secondary" className="text-xs">Digital Process</Badge>
                      )}
                      {!provider.collateral_required && (
                        <Badge variant="secondary" className="text-xs">No Collateral</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>Loan Types:</strong> {provider.loan_type.join(", ")}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-2">
                  <div className="flex gap-2 w-full">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={!user}
                              onClick={() => handleViewContact(provider)}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Contact
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!user && (
                          <TooltipContent>
                            <p>Sign in to access this feature</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={!user}
                              onClick={() => handleCallProvider(provider)}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!user && (
                          <TooltipContent>
                            <p>Sign in to access this feature</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={!user}
                            onClick={() => handleApplyNow(provider)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Apply Now
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!user && (
                        <TooltipContent>
                          <p>Sign in to access this feature</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {filteredProviders.length === 0 && !loading && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No financing options found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms" : "No financing providers are currently available"}
            </p>
          </div>
        )}
      </main>

      {/* Contact Details Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              {selectedProvider?.provider?.company_name || selectedProvider?.provider?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProvider?.provider && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{selectedProvider.provider.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{selectedProvider.provider.email || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{selectedProvider.provider.location || "Not provided"}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Call Provider Modal */}
      <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Provider</DialogTitle>
            <DialogDescription>
              Contact {selectedProvider?.provider?.company_name || selectedProvider?.provider?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProvider?.provider && (
            <div className="space-y-4">
              <div className="text-center">
                <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-lg font-semibold">
                  {selectedProvider.provider.phone || "Phone number not available"}
                </p>
                {selectedProvider.provider.phone && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Click the number above to call directly
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Application Modal */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Financing Application</DialogTitle>
            <DialogDescription>
              Apply for financing from {selectedProvider?.provider?.company_name || selectedProvider?.provider?.full_name}
            </DialogDescription>
          </DialogHeader>
          <ApplicationForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financing;