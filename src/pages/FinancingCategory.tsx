import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Grid, List, Search, Phone, Banknote, ChevronRight, Home, Percent, Calendar, CheckCircle } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { FINANCE_TYPES } from "@/constants/navigationMenus";

const FinancingCategory = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const categoryName = type ? decodeURIComponent(type).replace(/-/g, ' ') : '';
  const matchedType = FINANCE_TYPES.find(ft => 
    ft.toLowerCase() === categoryName.toLowerCase() ||
    ft.toLowerCase().replace(/\s+/g, '-') === type?.toLowerCase()
  );
  const displayName = matchedType || categoryName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [products, setProducts] = useState<any[]>([]);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancing = async () => {
      try {
        setLoading(true);

        // Fetch loan products
        const { data: productsData, error: prodError } = await supabase
          .from("loan_products")
          .select(`*, profiles!loan_products_provider_id_fkey (full_name, company_name, phone, mobile_number, email)`)
          .eq("is_active", true);

        if (prodError) throw prodError;

        // Fetch loan schemes
        const { data: schemesData, error: schemeError } = await supabase
          .from("loan_schemes")
          .select(`*, profiles:provider_id (full_name, company_name, phone, mobile_number, email)`)
          .eq("is_active", true);

        if (schemeError) throw schemeError;

        // Filter by type
        const filteredProducts = (productsData || []).filter(p => {
          const types = p.loan_type || [];
          return types.some((t: string) => t.toLowerCase().includes(categoryName.toLowerCase()));
        });

        const filteredSchemes = (schemesData || []).filter(s => {
          const schemeType = s.scheme_type?.toLowerCase() || '';
          return schemeType.includes(categoryName.toLowerCase()) || categoryName.toLowerCase().includes(schemeType);
        });

        setProducts(filteredProducts);
        setSchemes(filteredSchemes);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load financing options");
      } finally {
        setLoading(false);
      }
    };

    if (categoryName) fetchFinancing();
  }, [categoryName]);

  const allItems = [...products.map(p => ({ ...p, itemType: 'product' })), ...schemes.map(s => ({ ...s, itemType: 'scheme' }))];

  const filteredItems = allItems.filter(item => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return item.product_name?.toLowerCase().includes(search) || 
           item.scheme_name?.toLowerCase().includes(search) ||
           item.profiles?.company_name?.toLowerCase().includes(search);
  });

  const handleContact = (item: any) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to contact providers.", variant: "destructive" });
      return;
    }
    const phone = item.profiles?.phone || item.profiles?.mobile_number;
    if (!phone) {
      toast({ title: "Contact Unavailable", description: "Provider's phone not available.", variant: "destructive" });
      return;
    }
    window.open(`tel:${phone}`, "_self");
  };

  const getDescription = () => {
    const desc: Record<string, string> = {
      "equipment leasing": "Flexible equipment leasing options for industrial robots with low upfront costs.",
      "robot financing": "Specialized robot financing solutions tailored for automation investments.",
      "working capital loans": "Working capital loans to fund your automation projects.",
      "asset-based lending": "Asset-based lending using your existing equipment as collateral.",
      "government schemes": "Government subsidies and schemes for industrial automation.",
      "msme loans": "MSME loans designed for small and medium enterprises investing in automation.",
      "trade finance": "Trade finance solutions for importing robots and equipment.",
      "project finance": "Complete project financing for large automation installations."
    };
    return desc[categoryName.toLowerCase()] || `${displayName} options for industrial robot purchases.`;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${displayName} for Robots | RobotVerse Financing`}
        description={`${getDescription()} Compare rates and apply online.`}
        keywords={`${displayName}, robot financing, equipment finance, automation loans`}
        canonical={`/financing/${type}`}
      />

      <EnhancedHeader />

      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary flex items-center"><Home className="w-4 h-4 mr-1" />Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/financing" className="hover:text-primary">Financing</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{displayName}</span>
        </nav>
      </div>

      <div className="relative bg-muted border-b border-border">
        <div className="absolute inset-0 bg-primary opacity-10"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <Banknote className="w-10 h-10 text-primary mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">{displayName}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{getDescription()}</p>
            <p className="mt-4 text-sm text-muted-foreground">{filteredItems.length} options available</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8 bg-card border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search financing options..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <div className="flex space-x-2">
                <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}><Grid className="w-4 h-4" /></Button>
                <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading {displayName}...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No {displayName} Options Found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search.</p>
            <Button variant="outline" onClick={() => navigate('/financing')}>Browse All Financing</Button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredItems.map((item) => (
              <Card key={item.id} className="bg-card border-border hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.product_name || item.scheme_name}</CardTitle>
                    {item.is_government_scheme && <Badge className="bg-green-500/10 text-green-500">Govt.</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.profiles?.company_name || 'Finance Provider'}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{item.itemType === 'product' ? 'Loan Product' : 'Scheme'}</Badge>
                    {item.quick_approval && <Badge className="bg-primary/10 text-primary">Quick Approval</Badge>}
                  </div>

                  <div className="text-center py-2">
                    <span className="text-2xl font-bold text-primary">Up to {formatAmount(item.max_amount)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Percent className="w-4 h-4 mr-2" />
                      <span>{item.min_interest_rate || item.interest_rate_min}% - {item.max_interest_rate || item.interest_rate_max}%</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Up to {item.max_tenure_months} months</span>
                    </div>
                  </div>

                  {item.features && item.features.length > 0 && (
                    <div className="space-y-1">
                      {item.features.slice(0, 3).map((feature: string, i: number) => (
                        <div key={i} className="flex items-center text-sm text-muted-foreground">
                          <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                          <span className="truncate">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button className="w-full" onClick={() => handleContact(item)}>
                    <Phone className="w-4 h-4 mr-2" />Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancingCategory;
