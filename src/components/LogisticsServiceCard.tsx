import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, MapPin, Clock, Shield, Zap, Package, Globe, Star, Phone, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogisticsService {
  id: string;
  provider_id: string;
  service_name: string;
  service_type: string;
  description?: string;
  coverage_areas: string[];
  international_coverage: string[];
  base_price: number;
  price_per_km: number;
  price_per_kg: number;
  max_weight_kg: number;
  max_volume_m3: number;
  delivery_time_hours: number;
  transport_modes: string[];
  special_handling: boolean;
  insurance_included: boolean;
  tracking_available: boolean;
  emergency_delivery: boolean;
  is_international: boolean;
  is_active: boolean;
}

interface ProviderProfile {
  id: string;
  user_id: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  location?: string;
}

interface LogisticsServiceCardProps {
  robotLocation?: string;
  onRequestQuote?: (serviceId: string, providerId: string) => void;
  limit?: number;
}

const LogisticsServiceCard = ({ robotLocation, onRequestQuote, limit = 3 }: LogisticsServiceCardProps) => {
  const [services, setServices] = useState<LogisticsService[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogisticsServices();
  }, [robotLocation, limit]);

  const fetchLogisticsServices = async () => {
    try {
      setLoading(true);
      
      // Fetch active logistics services
      const { data: servicesData, error: servicesError } = await supabase
        .from('logistics_services')
        .select('*')
        .eq('is_active', true)
        .limit(limit);

      if (servicesError) throw servicesError;

      const servicesList = servicesData || [];
      setServices(servicesList);

      // Fetch provider profiles for the services
      if (servicesList.length > 0) {
        const providerIds = [...new Set(servicesList.map(s => s.provider_id))];
        
        const { data: providersData, error: providersError } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, company_name, phone, email, location')
          .in('user_id', providerIds);

        if (providersError) throw providersError;
        setProviders(providersData || []);
      }

    } catch (error) {
      console.error('Error fetching logistics services:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderInfo = (providerId: string) => {
    return providers.find(p => p.user_id === providerId);
  };

  const isLocationCovered = (service: LogisticsService, location?: string) => {
    if (!location) return true;
    
    // Check if the robot location matches any coverage area
    const locationLower = location.toLowerCase();
    return service.coverage_areas.some(area => 
      area.toLowerCase().includes(locationLower) || 
      locationLower.includes(area.toLowerCase())
    );
  };

  const getDeliveryEstimate = (hours: number) => {
    if (hours <= 24) return `${hours}h`;
    const days = Math.ceil(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Logistics Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-muted/30 h-20 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Logistics Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No logistics services available at the moment
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Available Logistics Services
          {robotLocation && (
            <Badge variant="outline" className="ml-auto">
              For {robotLocation}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services
            .filter(service => robotLocation ? isLocationCovered(service, robotLocation) : true)
            .slice(0, limit)
            .map((service) => {
              const provider = getProviderInfo(service.provider_id);
              
              return (
                <div key={service.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{service.service_name}</h4>
                        {service.is_international && (
                          <Globe className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {service.service_type}
                      </Badge>
                      {provider && (
                        <p className="text-sm text-muted-foreground mt-1">
                          by {provider.company_name || provider.full_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">₹{service.base_price}</div>
                      <div className="text-xs text-muted-foreground">Base price</div>
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{getDeliveryEstimate(service.delivery_time_hours)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-green-600" />
                      <span>Max {service.max_weight_kg}kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span>{service.coverage_areas.length} areas</span>
                    </div>
                    {service.price_per_km > 0 && (
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-purple-600" />
                        <span>₹{service.price_per_km}/km</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {service.tracking_available && (
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        Tracking
                      </Badge>
                    )}
                    {service.insurance_included && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Insurance
                      </Badge>
                    )}
                    {service.emergency_delivery && (
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Emergency
                      </Badge>
                    )}
                    {service.special_handling && (
                      <Badge variant="secondary" className="text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        Special Handling
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {service.transport_modes.slice(0, 2).map((mode, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {mode}
                        </Badge>
                      ))}
                      {service.transport_modes.length > 2 && (
                        <span className="text-xs">+{service.transport_modes.length - 2} more</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {provider?.phone && (
                        <Button size="sm" variant="outline" className="h-8 px-2">
                          <Phone className="w-3 h-3" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        onClick={() => onRequestQuote?.(service.id, service.provider_id)}
                        className="h-8"
                      >
                        Get Quote
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

          {services.length > limit && (
            <div className="text-center pt-4">
              <Button variant="outline" size="sm">
                View All {services.length} Services
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LogisticsServiceCard;