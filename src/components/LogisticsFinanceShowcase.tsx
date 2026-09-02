import { useState, useEffect } from "react";
import { Truck, CreditCard, MapPin, Clock, DollarSign, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface LogisticsService {
  id: string;
  service_name: string;
  service_type: string;
  coverage_areas: string[];
  base_price: number;
  delivery_time_hours: number;
  transport_modes: string[];
  provider: {
    company_name: string;
    full_name: string;
  };
}

interface LoanProduct {
  id: string;
  product_name: string;
  loan_type: string[];
  min_amount: number;
  max_amount: number;
  min_interest_rate: number;
  max_interest_rate: number;
  provider: {
    company_name: string;
    full_name: string;
  };
}

const LogisticsFinanceShowcase = () => {
  const [logisticsServices, setLogisticsServices] = useState<LogisticsService[]>([]);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch logistics services
      const { data: logistics } = await supabase
        .from('logistics_services')
        .select(`
          id,
          service_name,
          service_type,
          coverage_areas,
          base_price,
          delivery_time_hours,
          transport_modes,
          profiles!logistics_services_provider_id_fkey (
            company_name,
            full_name
          )
        `)
        .eq('is_active', true)
        .limit(3);

      // Fetch loan products
      const { data: loans } = await supabase
        .from('loan_products')
        .select(`
          id,
          product_name,
          loan_type,
          min_amount,
          max_amount,
          min_interest_rate,
          max_interest_rate,
          profiles!loan_products_provider_id_fkey (
            company_name,
            full_name
          )
        `)
        .eq('is_active', true)
        .limit(3);

      if (logistics) {
        setLogisticsServices(logistics.map(service => ({
          ...service,
          provider: service.profiles
        })));
      }

      if (loans) {
        setLoanProducts(loans.map(loan => ({
          ...loan,
          provider: loan.profiles
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-primary">
            Logistics & Finance Partners
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Seamless delivery solutions and flexible financing options for your robotics needs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Logistics Services */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary-foreground" />
                </div>
                Logistics Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {logisticsServices.length > 0 ? (
                logisticsServices.map((service) => (
                  <div key={service.id} className="p-4 border rounded-lg border-border/50 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">{service.service_name}</h4>
                      <Badge variant="secondary">{service.service_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      by {service.provider?.company_name || service.provider?.full_name}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{service.delivery_time_hours}h delivery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span>₹{service.base_price} base rate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{service.coverage_areas?.length || 0} areas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span>{service.transport_modes?.length || 0} modes</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No logistics services available</p>
                </div>
              )}
              <Link to="/services">
                <Button className="w-full mt-4">View All Logistics Services</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Finance Products */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
                Finance Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loanProducts.length > 0 ? (
                loanProducts.map((product) => (
                  <div key={product.id} className="p-4 border rounded-lg border-border/50 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">{product.product_name}</h4>
                      <Badge variant="secondary">{product.loan_type?.[0]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      by {product.provider?.company_name || product.provider?.full_name}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount Range:</span>
                        <p className="font-semibold">₹{product.min_amount?.toLocaleString()} - ₹{product.max_amount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Interest Rate:</span>
                        <p className="font-semibold">{product.min_interest_rate}% - {product.max_interest_rate}%</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No finance products available</p>
                </div>
              )}
              <Link to="/services">
                <Button className="w-full mt-4">View All Finance Options</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default LogisticsFinanceShowcase;