import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Truck, MapPin, Package, Clock } from 'lucide-react';

interface LogisticsServiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const LogisticsServiceForm = ({ onSuccess, onCancel }: LogisticsServiceFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    service_name: '',
    service_type: '',
    description: '',
    coverage_area: '',
    base_price: '',
    price_per_km: '',
    price_per_kg: '',
    max_weight: '',
    max_volume: '',
    delivery_time_hours: '',
    transport_modes: [] as string[],
    special_handling: false,
    insurance_included: false,
    tracking_available: false,
    emergency_delivery: false
  });

  const serviceTypes = [
    'Local Delivery',
    'Inter-city Transport',
    'International Shipping',
    'Heavy Equipment Transport',
    'Fragile Item Handling',
    'Bulk Transport',
    'Express Delivery',
    'Warehousing'
  ];

  const transportModes = [
    'Road Transport',
    'Rail Transport',
    'Air Cargo',
    'Sea Freight',
    'Pipeline',
    'Multi-modal'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTransportModeChange = (mode: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      transport_modes: checked 
        ? [...prev.transport_modes, mode]
        : prev.transport_modes.filter(m => m !== mode)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to add logistics services"
      });
      return;
    }

    if (!formData.service_name || !formData.service_type || !formData.coverage_area) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    setLoading(true);

    try {
      // For now, show success message since logistics_services table doesn't exist yet
      // This will be functional once the table is created
      console.log('Logistics service data:', {
        provider_id: user.id,
        service_name: formData.service_name,
        service_type: formData.service_type,
        description: formData.description,
        coverage_area: formData.coverage_area,
        base_price: parseFloat(formData.base_price) || 0,
        price_per_km: parseFloat(formData.price_per_km) || 0,
        price_per_kg: parseFloat(formData.price_per_kg) || 0,
        max_weight: parseFloat(formData.max_weight) || 0,
        max_volume: parseFloat(formData.max_volume) || 0,
        delivery_time_hours: parseInt(formData.delivery_time_hours) || 24,
        transport_modes: formData.transport_modes,
        special_handling: formData.special_handling,
        insurance_included: formData.insurance_included,
        tracking_available: formData.tracking_available,
        emergency_delivery: formData.emergency_delivery,
        is_active: true
      });

      toast({
        title: "Success",
        description: "Logistics service form completed! (Database integration pending)"
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding logistics service:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add logistics service"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Add Logistics Service
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service_name">Service Name *</Label>
              <Input
                id="service_name"
                value={formData.service_name}
                onChange={(e) => handleInputChange('service_name', e.target.value)}
                placeholder="e.g., Express City Delivery"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type *</Label>
              <Select onValueChange={(value) => handleInputChange('service_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your logistics service..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverage_area">Coverage Area *</Label>
            <Input
              id="coverage_area"
              value={formData.coverage_area}
              onChange={(e) => handleInputChange('coverage_area', e.target.value)}
              placeholder="e.g., Mumbai Metropolitan Area"
              required
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price (₹)</Label>
              <Input
                id="base_price"
                type="number"
                value={formData.base_price}
                onChange={(e) => handleInputChange('base_price', e.target.value)}
                placeholder="500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price_per_km">Price per KM (₹)</Label>
              <Input
                id="price_per_km"
                type="number"
                step="0.01"
                value={formData.price_per_km}
                onChange={(e) => handleInputChange('price_per_km', e.target.value)}
                placeholder="12.50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price_per_kg">Price per KG (₹)</Label>
              <Input
                id="price_per_kg"
                type="number"
                step="0.01"
                value={formData.price_per_kg}
                onChange={(e) => handleInputChange('price_per_kg', e.target.value)}
                placeholder="5.00"
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_weight">Max Weight (KG)</Label>
              <Input
                id="max_weight"
                type="number"
                value={formData.max_weight}
                onChange={(e) => handleInputChange('max_weight', e.target.value)}
                placeholder="1000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_volume">Max Volume (m³)</Label>
              <Input
                id="max_volume"
                type="number"
                step="0.01"
                value={formData.max_volume}
                onChange={(e) => handleInputChange('max_volume', e.target.value)}
                placeholder="10.5"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delivery_time_hours">Delivery Time (Hours)</Label>
              <Input
                id="delivery_time_hours"
                type="number"
                value={formData.delivery_time_hours}
                onChange={(e) => handleInputChange('delivery_time_hours', e.target.value)}
                placeholder="24"
              />
            </div>
          </div>

          {/* Transport Modes */}
          <div className="space-y-2">
            <Label>Transport Modes</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {transportModes.map((mode) => (
                <div key={mode} className="flex items-center space-x-2">
                  <Checkbox
                    id={mode}
                    checked={formData.transport_modes.includes(mode)}
                    onCheckedChange={(checked) => handleTransportModeChange(mode, checked as boolean)}
                  />
                  <Label htmlFor={mode} className="text-sm">{mode}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label>Additional Features</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="special_handling"
                  checked={formData.special_handling}
                  onCheckedChange={(checked) => handleInputChange('special_handling', checked)}
                />
                <Label htmlFor="special_handling" className="text-sm">Special Handling</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insurance_included"
                  checked={formData.insurance_included}
                  onCheckedChange={(checked) => handleInputChange('insurance_included', checked)}
                />
                <Label htmlFor="insurance_included" className="text-sm">Insurance Included</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tracking_available"
                  checked={formData.tracking_available}
                  onCheckedChange={(checked) => handleInputChange('tracking_available', checked)}
                />
                <Label htmlFor="tracking_available" className="text-sm">Real-time Tracking</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergency_delivery"
                  checked={formData.emergency_delivery}
                  onCheckedChange={(checked) => handleInputChange('emergency_delivery', checked)}
                />
                <Label htmlFor="emergency_delivery" className="text-sm">Emergency Delivery</Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Service'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LogisticsServiceForm;