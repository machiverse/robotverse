import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { ChatButton } from "@/components/chat/ChatButton";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  CreditCard,
  Phone,
  Mail,
  Building2,
  Clock,
  FileText,
  CheckCircle,
  Percent,
  Calendar
} from "lucide-react";
import LockedContactCard from "@/components/LockedContactCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUniversalViewTracking } from "@/hooks/useUniversalViewTracking";
import { useButtonTracking } from "@/hooks/useButtonTracking";

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

const FinancingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackItemView } = useUniversalViewTracking();
  const { trackButtonClick } = useButtonTracking();
  const [provider, setProvider] = useState<FinanceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProvider = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("loan_products")
          .select(`
            *,
            profiles!loan_products_provider_id_fkey (
              full_name,
              company_name,
              location,
              phone,
              email
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        const transformedData: FinanceProvider = {
          id: data.id,
          product_name: data.product_name,
          description: data.description || "",
          loan_type: data.loan_type || [],
          min_amount: data.min_amount || 0,
          max_amount: data.max_amount || 0,
          min_interest_rate: data.min_interest_rate || 0,
          max_interest_rate: data.max_interest_rate || 0,
          min_tenure_months: data.min_tenure_months || 0,
          max_tenure_months: data.max_tenure_months || 0,
          processing_fee_percentage: data.processing_fee_percentage || 0,
          quick_approval: data.quick_approval || false,
          digital_process: data.digital_process || false,
          collateral_required: data.collateral_required || false,
          provider_id: data.provider_id,
          provider: data.profiles || undefined,
        };

        setProvider(transformedData);
        trackItemView("loan_products", data.id, transformedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load financing provider");
        setProvider(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id, trackItemView]);

  const handleContactProvider = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to contact financing providers.",
      });
      return;
    }

    if (!provider?.provider?.phone) {
      toast({
        variant: "destructive",
        title: "Contact Unavailable",
        description: "Provider's phone number is not available.",
      });
      return;
    }

    trackButtonClick({
      buttonName: "Contact Provider",
      buttonType: "financing_contact",
      sellerId: provider.provider_id,
      sellerName: provider.provider?.full_name,
      sellerCompany: provider.provider?.company_name,
      sellerEmail: provider.provider?.email,
      sellerMobile: provider.provider?.phone,
      sellerLocation: provider.provider?.location,
      itemId: provider.id,
      itemType: "financing",
    });

    window.open(`tel:${provider.provider.phone}`, "_self");
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin w-10 h-10" />
          <p className="ml-4 text-muted-foreground text-lg">Loading financing details...</p>
        </main>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen flex flex-col">
        <EnhancedHeader />
        <main className="flex-grow flex flex-col justify-center items-center text-center px-4">
          <CreditCard className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Financing provider not found</h2>
          <p className="text-muted-foreground mb-4">{error || "The provider you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate("/financing")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Financing
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnhancedHeader />

      <main className="flex-grow container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate("/financing")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Financing
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {provider.loan_type.map((type, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                  {provider.quick_approval && (
                    <Badge variant="default" className="text-xs">
                      Quick Approval
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-primary" />
                  {provider.product_name}
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  {provider.provider?.company_name || provider.provider?.full_name}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Loan Amount</span>
                    <p className="text-xl font-bold text-primary">
                      {formatAmount(provider.min_amount)} - {formatAmount(provider.max_amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Interest Rate</span>
                    <p className="text-xl font-bold text-primary">
                      {provider.min_interest_rate}% - {provider.max_interest_rate}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Product Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {provider.description || "Flexible financing solutions for your business needs."}
                </p>
              </CardContent>
            </Card>

            {/* Product Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Product Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <Calendar className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Tenure</span>
                    <span className="font-semibold text-foreground">
                      {provider.min_tenure_months} - {provider.max_tenure_months} months
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <Percent className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Processing Fee</span>
                    <span className="font-semibold text-foreground">{provider.processing_fee_percentage}%</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <Clock className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Process</span>
                    <span className="font-semibold text-foreground">
                      {provider.digital_process ? "Digital" : "Standard"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Collateral</span>
                    <span className="font-semibold text-foreground">
                      {provider.collateral_required ? "Required" : "Not Required"}
                    </span>
                  </div>
                </div>

                {/* Loan Types */}
                {provider.loan_type.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2 text-foreground">Available Loan Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {provider.loan_type.map((type, index) => (
                        <Badge key={index} variant="outline">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Locked Contact Card */}
            {provider.provider_id && (
              <LockedContactCard
                sellerId={provider.provider_id}
                itemId={provider.id}
                itemType="finance"
                itemName={provider.product_name}
                sellerProfile={{
                  full_name: provider.provider?.full_name,
                  company_name: provider.provider?.company_name,
                  phone: provider.provider?.phone,
                  email: provider.provider?.email,
                  location: provider.provider?.location
                }}
                showLocation={true}
              />
            )}

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={handleContactProvider}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Provider
                </Button>

                {user && provider.provider_id && user.id !== provider.provider_id && (
                  <ChatButton
                    otherUserId={provider.provider_id}
                    itemType="service"
                    itemId={provider.id}
                    itemName={provider.product_name}
                    className="w-full"
                    variant="secondary"
                    size="lg"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FinancingDetails;
