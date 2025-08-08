import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Truck, MapPin, Package, Clock, Globe, Building, CheckCircle2, Plus, X } from 'lucide-react';

interface LogisticsServiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingService?: any;
}

interface CoverageArea {
  id: string;
  area_name: string;
  area_type: string;
  state_name?: string;
  country_name?: string;
  zone_type: string;
  base_rate: number;
  per_kg_rate: number;
  delivery_time: string;
  provider_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const LogisticsServiceForm = ({ onSuccess, onCancel, editingService }: LogisticsServiceFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [availableCoverageAreas, setAvailableCoverageAreas] = useState<CoverageArea[]>([]);
  const [selectedCoverageAreas, setSelectedCoverageAreas] = useState<string[]>([]);
  const [showInternational, setShowInternational] = useState(false);
  
  const [formData, setFormData] = useState({
    service_name: editingService?.service_name || '',
    service_type: Array.isArray(editingService?.service_type) 
      ? editingService.service_type 
      : editingService?.service_type 
        ? editingService.service_type.split(', ').filter(Boolean)
        : [],
    description: editingService?.description || '',
    base_price: editingService?.base_price?.toString() || '',
    price_per_km: editingService?.price_per_km?.toString() || '',
    price_per_kg: editingService?.price_per_kg?.toString() || '',
    max_weight_kg: editingService?.max_weight_kg?.toString() || '',
    max_volume_m3: editingService?.max_volume_m3?.toString() || '',
    delivery_time_hours: editingService?.delivery_time_hours?.toString() || '',
    transport_modes: Array.isArray(editingService?.transport_modes) 
      ? editingService.transport_modes 
      : editingService?.transport_modes 
        ? editingService.transport_modes.split(', ').filter(Boolean)
        : [],
    special_handling: editingService?.special_handling || false,
    insurance_included: editingService?.insurance_included || false,
    tracking_available: editingService?.tracking_available || false,
    emergency_delivery: editingService?.emergency_delivery || false,
    is_international: editingService?.is_international || false,
    container_20ft_min: editingService?.container_20ft_min?.toString() || '',
    container_20ft_max: editingService?.container_20ft_max?.toString() || '',
    container_40ft_min: editingService?.container_40ft_min?.toString() || '',
    container_40ft_max: editingService?.container_40ft_max?.toString() || ''
  });

  const serviceTypes = [
    'Local Delivery',
    'Inter-city Transport', 
    'International Shipping',
    'Heavy Equipment Transport',
    'Fragile Item Handling',
    'Bulk Transport',
    'Express Delivery',
    'Warehousing & Storage',
    'Supply Chain Management',
    'Last Mile Delivery',
    'Industrial Machinery Transport',
    'Temperature Controlled Transport',
    'Hazardous Material Transport',
    'White Glove Service',
    'Installation & Setup Service',
    'Port Handling',
    'Duties Clearance'
  ];

  const transportModes = [
    'Road Transport',
    'Rail Transport',
    'Air Cargo',
    'Sea Freight',
    'Pipeline Transport',
    'Multi-modal Transport',
    'Specialized Equipment Transport',
    'Container Shipping',
    'Break Bulk Cargo',
    'Project Cargo'
  ];

  // Load coverage areas on component mount
  useEffect(() => {
    fetchCoverageAreas();
    if (editingService?.coverage_areas) {
      setSelectedCoverageAreas(editingService.coverage_areas);
    }
    if (editingService?.is_international) {
      setShowInternational(true);
    }
  }, [editingService]);

  const fetchCoverageAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('coverage_areas')
        .select('*')
        .eq('is_active', true)
        .order('area_type', { ascending: true })
        .order('zone_type', { ascending: true })
        .order('area_name', { ascending: true });

      if (error) throw error;
      
      // If no data exists, create comprehensive coverage areas
      if (!data || data.length === 0) {
        const indianStates = [
          'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
          'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
          'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
          'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
          'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 
          'Dadra and Nagar Haveli', 'Daman and Diu', 'Lakshadweep', 'Puducherry'
        ];

        const internationalRegions = [
          'USA', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
          'China', 'Japan', 'South Korea', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam',
          'Australia', 'New Zealand', 'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman',
          'Brazil', 'Argentina', 'Mexico', 'South Africa', 'Egypt', 'Nigeria', 'Kenya',
          'Russia', 'Turkey', 'Israel', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Myanmar'
        ];

        const defaultAreas = [
          ...indianStates.map((state, index) => ({
            id: `dom-${index + 1}`,
            area_name: state,
            area_type: 'domestic',
            zone_type: 'state',
            delivery_time: '24-72 hours',
            base_rate: 100,
            per_kg_rate: 10,
            is_active: true,
            provider_id: '',
            created_at: '',
            updated_at: ''
          })),
          ...internationalRegions.map((region, index) => ({
            id: `int-${index + 1}`,
            area_name: region,
            area_type: 'international',
            zone_type: 'international',
            delivery_time: '5-15 days',
            base_rate: 2000,
            per_kg_rate: 200,
            is_active: true,
            provider_id: '',
            created_at: '',
            updated_at: '',
            container_20ft_price: 50000 + (index * 1000),
            container_40ft_price: 85000 + (index * 1500)
          }))
        ];
        setAvailableCoverageAreas(defaultAreas as any);
      } else {
        setAvailableCoverageAreas(data);
      }
    } catch (error) {
      console.error('Error fetching coverage areas:', error);
      // Fallback to default areas in case of error
      const defaultAreas = [
        { id: 'dom-1', area_name: 'Maharashtra', area_type: 'domestic', zone_type: 'state', delivery_time: '24-72 hours', base_rate: 100, per_kg_rate: 10, is_active: true, provider_id: '', created_at: '', updated_at: '' },
        { id: 'dom-2', area_name: 'Karnataka', area_type: 'domestic', zone_type: 'state', delivery_time: '24-72 hours', base_rate: 100, per_kg_rate: 10, is_active: true, provider_id: '', created_at: '', updated_at: '' },
        { id: 'int-1', area_name: 'USA', area_type: 'international', zone_type: 'international', delivery_time: '7-10 days', base_rate: 2000, per_kg_rate: 200, is_active: true, provider_id: '', created_at: '', updated_at: '', container_20ft_price: 50000, container_40ft_price: 85000 }
      ];
      setAvailableCoverageAreas(defaultAreas as any);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceTypeChange = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      service_type: checked 
        ? [...prev.service_type, type]
        : prev.service_type.filter(t => t !== type)
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

  const handleCoverageAreaToggle = (areaId: string) => {
    setSelectedCoverageAreas(prev => 
      prev.includes(areaId) 
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handleSelectAllDomestic = () => {
    const domesticAreas = availableCoverageAreas
      .filter(area => area.area_type === 'domestic')
      .map(area => area.id);
    
    const allSelected = domesticAreas.every(id => selectedCoverageAreas.includes(id));
    
    if (allSelected) {
      setSelectedCoverageAreas(prev => prev.filter(id => !domesticAreas.includes(id)));
    } else {
      setSelectedCoverageAreas(prev => [...new Set([...prev, ...domesticAreas])]);
    }
  };

  const handleSelectAllInternational = () => {
    const internationalAreas = availableCoverageAreas
      .filter(area => area.area_type === 'international')
      .map(area => area.id);
    
    const allSelected = internationalAreas.every(id => selectedCoverageAreas.includes(id));
    
    if (allSelected) {
      setSelectedCoverageAreas(prev => prev.filter(id => !internationalAreas.includes(id)));
    } else {
      setSelectedCoverageAreas(prev => [...new Set([...prev, ...internationalAreas])]);
    }
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

    if (!formData.service_name || formData.service_type.length === 0 || selectedCoverageAreas.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields and select at least one coverage area"
      });
      return;
    }

    setLoading(true);

    try {
      const selectedAreas = availableCoverageAreas.filter(area => 
        selectedCoverageAreas.includes(area.id)
      );
      
      const serviceData = {
        provider_id: user.id,
        service_name: formData.service_name,
        service_type: formData.service_type.join(', '),
        description: formData.description,
        coverage_areas: selectedAreas.map(area => area.area_name),
        international_coverage: selectedAreas.filter(area => area.area_type === 'international').map(area => area.area_name),
        base_price: parseFloat(formData.base_price) || 0,
        price_per_km: parseFloat(formData.price_per_km) || 0,
        price_per_kg: parseFloat(formData.price_per_kg) || 0,
        max_weight_kg: parseFloat(formData.max_weight_kg) || 0,
        max_volume_m3: parseFloat(formData.max_volume_m3) || 0,
        delivery_time_hours: parseInt(formData.delivery_time_hours) || 24,
        transport_modes: formData.transport_modes,
        special_handling: formData.special_handling,
        insurance_included: formData.insurance_included,
        tracking_available: formData.tracking_available,
        emergency_delivery: formData.emergency_delivery,
        is_international: selectedAreas.some(area => area.area_type === 'international'),
        is_active: true,
        container_20ft_min: parseFloat(formData.container_20ft_min) || null,
        container_20ft_max: parseFloat(formData.container_20ft_max) || null,
        container_40ft_min: parseFloat(formData.container_40ft_min) || null,
        container_40ft_max: parseFloat(formData.container_40ft_max) || null
      };

      if (editingService?.id) {
        // Update existing service
        const { error } = await supabase
          .from('logistics_services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Logistics service updated successfully!"
        });
      } else {
        // Create new service
        const { error } = await supabase
          .from('logistics_services')
          .insert([serviceData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Logistics service created successfully!"
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving logistics service:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save logistics service"
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
              <Label htmlFor="service_type">Service Types *</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-1 gap-2">
                  {serviceTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={formData.service_type.includes(type)}
                        onCheckedChange={(checked) => handleServiceTypeChange(type, !!checked)}
                      />
                      <Label htmlFor={type} className="text-sm cursor-pointer flex-1">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              {formData.service_type.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.service_type.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                      <X 
                        className="w-3 h-3 ml-1 cursor-pointer" 
                        onClick={() => handleServiceTypeChange(type, false)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
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

          {/* Coverage Areas Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Coverage Areas *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllDomestic}
                  className="text-xs"
                >
                  <Building className="w-3 h-3 mr-1" />
                  {availableCoverageAreas.filter(area => area.area_type === 'domestic').every(area => selectedCoverageAreas.includes(area.id)) ? 'Deselect All Domestic' : 'Select All Domestic'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInternational(!showInternational)}
                  className="text-xs"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  {showInternational ? 'Hide International' : 'Show International'}
                </Button>
              </div>
            </div>

            {/* Domestic Coverage */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Domestic Coverage (India)
                </h4>
                <Badge variant="outline">
                  {availableCoverageAreas.filter(area => area.area_type === 'domestic' && selectedCoverageAreas.includes(area.id)).length} selected
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                {availableCoverageAreas
                  .filter(area => area.area_type === 'domestic')
                  .map((area) => (
                    <div key={area.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={area.id}
                        checked={selectedCoverageAreas.includes(area.id)}
                        onCheckedChange={() => handleCoverageAreaToggle(area.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={area.id} className="text-xs font-medium cursor-pointer">
                          {area.area_name}
                        </Label>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* International Coverage */}
            {showInternational && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    International Coverage
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {availableCoverageAreas.filter(area => area.area_type === 'international' && selectedCoverageAreas.includes(area.id)).length} selected
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllInternational}
                      className="text-xs"
                    >
                      {availableCoverageAreas.filter(area => area.area_type === 'international').every(area => selectedCoverageAreas.includes(area.id)) ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                  {availableCoverageAreas
                    .filter(area => area.area_type === 'international')
                    .map((area) => (
                      <div key={area.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                        <Checkbox
                          id={area.id}
                          checked={selectedCoverageAreas.includes(area.id)}
                          onCheckedChange={() => handleCoverageAreaToggle(area.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={area.id} className="text-xs font-medium cursor-pointer">
                            {area.area_name}
                          </Label>
                        </div>
                      </div>
                    ))}
                </div>
                
                {/* Container Pricing Options */}
                {selectedCoverageAreas.some(id => availableCoverageAreas.find(area => area.id === id)?.area_type === 'international') && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <h5 className="text-sm font-medium mb-2">Container Pricing Options</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded p-3 space-y-3">
                        <div className="font-medium text-sm">20ft Container</div>
                        <div className="text-xs text-muted-foreground">Standard shipping container</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Min Price (₹)</Label>
                            <Input
                              type="number"
                              placeholder="45000"
                              value={formData.container_20ft_min}
                              onChange={(e) => handleInputChange('container_20ft_min', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max Price (₹)</Label>
                            <Input
                              type="number"
                              placeholder="75000"
                              value={formData.container_20ft_max}
                              onChange={(e) => handleInputChange('container_20ft_max', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="border rounded p-3 space-y-3">
                        <div className="font-medium text-sm">40ft Container</div>
                        <div className="text-xs text-muted-foreground">High capacity container</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Min Price (₹)</Label>
                            <Input
                              type="number"
                              placeholder="75000"
                              value={formData.container_40ft_min}
                              onChange={(e) => handleInputChange('container_40ft_min', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max Price (₹)</Label>
                            <Input
                              type="number"
                              placeholder="125000"
                              value={formData.container_40ft_max}
                              onChange={(e) => handleInputChange('container_40ft_max', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedCoverageAreas.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Selected Areas ({selectedCoverageAreas.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedCoverageAreas.slice(0, 6).map(areaId => {
                    const area = availableCoverageAreas.find(a => a.id === areaId);
                    return area ? (
                      <Badge key={areaId} variant="secondary" className="text-xs">
                        {area.area_name}
                        <X 
                          className="w-3 h-3 ml-1 cursor-pointer" 
                          onClick={() => handleCoverageAreaToggle(areaId)}
                        />
                      </Badge>
                    ) : null;
                  })}
                  {selectedCoverageAreas.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedCoverageAreas.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
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
              <Label htmlFor="max_weight_kg">Max Weight (KG)</Label>
              <Input
                id="max_weight_kg"
                type="number"
                value={formData.max_weight_kg}
                onChange={(e) => handleInputChange('max_weight_kg', e.target.value)}
                placeholder="1000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_volume_m3">Max Volume (m³)</Label>
              <Input
                id="max_volume_m3"
                type="number"
                step="0.01"
                value={formData.max_volume_m3}
                onChange={(e) => handleInputChange('max_volume_m3', e.target.value)}
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
              {loading ? (editingService ? 'Updating...' : 'Adding...') : (editingService ? 'Update Service' : 'Add Service')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LogisticsServiceForm;