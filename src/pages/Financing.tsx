import { useState, useEffect, useMemo } from "react";
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
import {
  Search,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
  Filter,
  X,
  Grid,
  List,
  TrendingUp,
  ChevronRight,
  Loader2
} from "lucide-react";
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

const LOAN_TYPES = [
  { value: "all", label: "All Types" },
  { value: "Business Loan", label: "Business Loan" },
  { value: "Equipment Finance", label: "Equipment Finance" },
  { value: "Working Capital", label: "Working Capital" },
  { value: "Invoice Financing", label: "Invoice Financing" },
  { value: "Term Loan", label: "Term Loan" },
  { value: "MSME Loan", label: "MSME Loan" },
  { value: "Startup Funding", label: "Startup Funding" },
];

const AMOUNT_RANGES = [
  { value: "all", label: "All Amounts" },
  { value: "under-5l", label: "Under ₹5 Lakh" },
  { value: "5l-25l", label: "₹5 - ₹25 Lakh" },
  { value: "25l-1cr", label: "₹25 Lakh - ₹1 Cr" },
  { value: "over-1cr", label: "Over ₹1 Cr" },
];

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
  const [selectedAmountRange, setSelectedAmountRange] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<FinanceProvider | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"views" | "interest-low" | "interest-high" | "amount-high">("views");

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

  const filteredProviders = useMemo(() => {
    let filtered = providers.filter(provider => {
      const matchesSearch =
        provider.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.loan_type.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = selectedType === "all" ||
        provider.loan_type.some(type => type.toLowerCase().includes(selectedType.toLowerCase()));

      let matchesAmount = true;
      if (selectedAmountRange !== "all") {
        const ranges: Record<string, [number, number]> = {
          "under-5l": [0, 500000],
          "5l-25l": [500000, 2500000],
          "25l-1cr": [2500000, 10000000],
          "over-1cr": [10000000, Infinity],
        };
        const [min, max] = ranges[selectedAmountRange] || [0, Infinity];
        matchesAmount = provider.max_amount >= min && provider.min_amount <= max;
      }

      return matchesSearch && matchesType && matchesAmount;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "interest-low":
          return (a.min_interest_rate || 0) - (b.min_interest_rate || 0);
        case "interest-high":
          return (b.min_interest_rate || 0) - (a.min_interest_rate || 0);
        case "amount-high":
          return (b.max_amount || 0) - (a.max_amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [providers, searchTerm, selectedType, selectedAmountRange, sortBy]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedAmountRange("all");
  };

  const hasActiveFilters = searchTerm || selectedType !== "all" || selectedAmountRange !== "all";

  const handleViewContact = (provider: FinanceProvider) => {
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
          className="w-full p-2 border rounded-md resize-none bg-background"
          rows={3}
          placeholder="Describe how you plan to use this financing..."
        />
      </div>
      <Button className="w-full">Submit Application</Button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading financing options...</p>
        </main>
      </div>
    );
  }

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

      {/* Top title */}
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Flexible Robot Financing
        </h1>
        <p className="text-muted-foreground">
          Make your automation dreams affordable with customized financing solutions
        </p>

        {/* Breadcrumb */}
        {selectedType !== "all" && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-4 flex-wrap">
            <span className="hover:text-primary cursor-pointer" onClick={() => clearFilters()}>
              Financing
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-medium">{selectedType}</span>
          </div>
        )}
      </div>

      {/* Layout: left filter, right listing */}
      <div className="container mx-auto px-4 pb-10 flex gap-6">
        {/* LEFT FILTER COLUMN (sticky) */}
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="w-4 h-4" />
                    Filter Financing
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search financing..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Loan Type */}
                <div>
                  <p className="text-xs font-semibold mb-1">Loan Type</p>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOAN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Range */}
                <div>
                  <p className="text-xs font-semibold mb-1">Amount Range</p>
                  <Select value={selectedAmountRange} onValueChange={setSelectedAmountRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Amounts" />
                    </SelectTrigger>
                    <SelectContent>
                      {AMOUNT_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* RIGHT CONTENT COLUMN */}
        <main className="flex-1 space-y-6">
          {/* Top bar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Financing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* For mobile: filter + search */}
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search financing..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Loan Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOAN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedAmountRange} onValueChange={setSelectedAmountRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Amount" />
                    </SelectTrigger>
                    <SelectContent>
                      {AMOUNT_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sort + View toggle */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredProviders.length}</span> options
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Sort by</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-36">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="views">Most Popular</SelectItem>
                      <SelectItem value="interest-low">Interest: Low-High</SelectItem>
                      <SelectItem value="interest-high">Interest: High-Low</SelectItem>
                      <SelectItem value="amount-high">Max Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex border rounded-md overflow-hidden">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="icon"
                      className="rounded-none h-8 w-8"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="icon"
                      className="rounded-none h-8 w-8"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Providers grid/list */}
          {filteredProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Card className="max-w-md bg-card border-border">
                <CardContent className="p-8 text-center">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No financing options found</h3>
                  <p className="text-muted-foreground">
                    {hasActiveFilters
                      ? "Try adjusting your search terms"
                      : "No options are currently available"}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"}>
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
                                onClick={(e) => { e.stopPropagation(); handleViewContact(provider); }}
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
                                onClick={(e) => { e.stopPropagation(); handleCallProvider(provider); }}
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
                              onClick={(e) => { e.stopPropagation(); handleApplyNow(provider); }}
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
        </main>
      </div>

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

      {/* Application Modal */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Loan Application</DialogTitle>
            <DialogDescription>
              Apply for {selectedProvider?.product_name} from {selectedProvider?.provider?.company_name || selectedProvider?.provider?.full_name}
            </DialogDescription>
          </DialogHeader>
          <ApplicationForm />
        </DialogContent>
      </Dialog>

      {/* Call Modal */}
      <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Provider</DialogTitle>
            <DialogDescription>
              {selectedProvider?.provider?.company_name || selectedProvider?.provider?.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider?.provider?.phone ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{selectedProvider.provider.phone}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => window.open(`tel:${selectedProvider.provider?.phone}`, "_self")}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Phone number not available</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financing;
