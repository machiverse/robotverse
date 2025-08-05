-- Add foreign key relationship between logistics_services and profiles
-- First, ensure the provider_id column exists and references profiles correctly
ALTER TABLE logistics_services 
ADD CONSTRAINT logistics_services_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES profiles(user_id);