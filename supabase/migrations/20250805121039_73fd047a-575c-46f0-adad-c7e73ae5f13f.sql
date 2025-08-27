-- Add foreign key relationship between loan_products and profiles
ALTER TABLE loan_products 
ADD CONSTRAINT loan_products_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES profiles(user_id) ON DELETE CASCADE;