-- Create logistics_services table for comprehensive service management
CREATE TABLE public.logistics_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  coverage_areas TEXT[] DEFAULT '{}'::TEXT[],
  international_coverage TEXT[] DEFAULT '{}'::TEXT[],
  base_price NUMERIC DEFAULT 0,
  price_per_km NUMERIC DEFAULT 0,
  price_per_kg NUMERIC DEFAULT 0,
  max_weight_kg NUMERIC DEFAULT 0,
  max_volume_m3 NUMERIC DEFAULT 0,
  delivery_time_hours INTEGER DEFAULT 24,
  transport_modes TEXT[] DEFAULT '{}'::TEXT[],
  special_handling BOOLEAN DEFAULT false,
  insurance_included BOOLEAN DEFAULT false,
  tracking_available BOOLEAN DEFAULT false,
  emergency_delivery BOOLEAN DEFAULT false,
  is_international BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logistics_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for logistics_services
CREATE POLICY "Providers can manage their own services" 
ON public.logistics_services 
FOR ALL 
USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view active services" 
ON public.logistics_services 
FOR SELECT 
USING (is_active = true);

-- Create coverage_areas table for detailed area management
CREATE TABLE public.coverage_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  area_name TEXT NOT NULL,
  area_type TEXT NOT NULL DEFAULT 'domestic', -- 'domestic' or 'international'
  state_name TEXT,
  country_name TEXT DEFAULT 'India',
  zone_type TEXT NOT NULL DEFAULT 'local', -- 'local', 'metro', 'state', 'interstate', 'international'
  base_rate NUMERIC NOT NULL DEFAULT 0,
  per_kg_rate NUMERIC NOT NULL DEFAULT 0,
  delivery_time TEXT NOT NULL DEFAULT '24 hours',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coverage_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coverage_areas
CREATE POLICY "Providers can manage their own coverage areas" 
ON public.coverage_areas 
FOR ALL 
USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view active coverage areas" 
ON public.coverage_areas 
FOR SELECT 
USING (is_active = true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_logistics_services_updated_at
  BEFORE UPDATE ON public.logistics_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coverage_areas_updated_at
  BEFORE UPDATE ON public.coverage_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Indian states and major cities for coverage selection
INSERT INTO public.coverage_areas (provider_id, area_name, area_type, state_name, zone_type, base_rate, per_kg_rate, delivery_time, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'Mumbai Metropolitan Area', 'domestic', 'Maharashtra', 'metro', 100, 5, '12 hours', false),
('00000000-0000-0000-0000-000000000001', 'Delhi NCR', 'domestic', 'Delhi', 'metro', 120, 6, '12 hours', false),
('00000000-0000-0000-0000-000000000001', 'Bangalore Urban', 'domestic', 'Karnataka', 'metro', 110, 5.5, '12 hours', false),
('00000000-0000-0000-0000-000000000001', 'Chennai Metropolitan', 'domestic', 'Tamil Nadu', 'metro', 105, 5.2, '12 hours', false),
('00000000-0000-0000-0000-000000000001', 'Hyderabad Metro', 'domestic', 'Telangana', 'metro', 100, 5, '12 hours', false),
('00000000-0000-0000-0000-000000000001', 'Kolkata Metropolitan', 'domestic', 'West Bengal', 'metro', 95, 4.8, '12 hours', false),
('00000000-0000-0000-0000-000000000001', 'Pune District', 'domestic', 'Maharashtra', 'local', 80, 4, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Ahmedabad District', 'domestic', 'Gujarat', 'local', 85, 4.2, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Surat District', 'domestic', 'Gujarat', 'local', 75, 3.8, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Jaipur District', 'domestic', 'Rajasthan', 'local', 80, 4, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Lucknow District', 'domestic', 'Uttar Pradesh', 'local', 70, 3.5, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Kanpur District', 'domestic', 'Uttar Pradesh', 'local', 68, 3.4, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Nagpur District', 'domestic', 'Maharashtra', 'local', 75, 3.8, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Indore District', 'domestic', 'Madhya Pradesh', 'local', 70, 3.5, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Thane District', 'domestic', 'Maharashtra', 'local', 85, 4.2, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Bhopal District', 'domestic', 'Madhya Pradesh', 'local', 65, 3.2, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Visakhapatnam District', 'domestic', 'Andhra Pradesh', 'local', 70, 3.5, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Patna District', 'domestic', 'Bihar', 'local', 60, 3, '24 hours', false),
('00000000-0000-0000-0000-000000000001', 'Vadodara District', 'domestic', 'Gujarat', 'local', 75, 3.8, '18 hours', false),
('00000000-0000-0000-0000-000000000001', 'Ghaziabad District', 'domestic', 'Uttar Pradesh', 'local', 70, 3.5, '18 hours', false);

-- Insert international coverage options
INSERT INTO public.coverage_areas (provider_id, area_name, area_type, country_name, zone_type, base_rate, per_kg_rate, delivery_time, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'United States', 'international', 'United States', 'international', 5000, 150, '7-10 days', false),
('00000000-0000-0000-0000-000000000001', 'United Kingdom', 'international', 'United Kingdom', 'international', 4500, 140, '5-7 days', false),
('00000000-0000-0000-0000-000000000001', 'Germany', 'international', 'Germany', 'international', 4200, 135, '5-7 days', false),
('00000000-0000-0000-0000-000000000001', 'Singapore', 'international', 'Singapore', 'international', 3000, 120, '3-5 days', false),
('00000000-0000-0000-0000-000000000001', 'United Arab Emirates', 'international', 'United Arab Emirates', 'international', 2800, 110, '3-5 days', false),
('00000000-0000-0000-0000-000000000001', 'Japan', 'international', 'Japan', 'international', 4800, 160, '5-8 days', false),
('00000000-0000-0000-0000-000000000001', 'South Korea', 'international', 'South Korea', 'international', 4200, 145, '5-7 days', false),
('00000000-0000-0000-0000-000000000001', 'China', 'international', 'China', 'international', 3500, 125, '4-6 days', false),
('00000000-0000-0000-0000-000000000001', 'Australia', 'international', 'Australia', 'international', 5200, 170, '7-10 days', false),
('00000000-0000-0000-0000-000000000001', 'Canada', 'international', 'Canada', 'international', 4800, 155, '7-10 days', false),
('00000000-0000-0000-0000-000000000001', 'Netherlands', 'international', 'Netherlands', 'international', 4000, 130, '5-7 days', false),
('00000000-0000-0000-0000-000000000001', 'France', 'international', 'France', 'international', 4100, 132, '5-7 days', false),
('00000000-0000-0000-0000-000000000001', 'Italy', 'international', 'Italy', 'international', 4300, 138, '6-8 days', false),
('00000000-0000-0000-0000-000000000001', 'Spain', 'international', 'Spain', 'international', 4200, 135, '6-8 days', false),
('00000000-0000-0000-0000-000000000001', 'Brazil', 'international', 'Brazil', 'international', 5500, 180, '10-15 days', false),
('00000000-0000-0000-0000-000000000001', 'Mexico', 'international', 'Mexico', 'international', 4500, 150, '8-12 days', false),
('00000000-0000-0000-0000-000000000001', 'Thailand', 'international', 'Thailand', 'international', 2500, 100, '3-5 days', false),
('00000000-0000-0000-0000-000000000001', 'Malaysia', 'international', 'Malaysia', 'international', 2200, 95, '3-5 days', false),
('00000000-0000-0000-0000-000000000001', 'Indonesia', 'international', 'Indonesia', 'international', 2800, 110, '4-6 days', false),
('00000000-0000-0000-0000-000000000001', 'Vietnam', 'international', 'Vietnam', 'international', 2300, 98, '3-5 days', false);