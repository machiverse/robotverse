-- Drop existing policy and create a simpler one that allows sellers to view interactions on their items
DROP POLICY IF EXISTS "Users can view interactions" ON user_interactions;

-- Create a policy that allows:
-- 1. Users to view their own interactions
-- 2. Sellers to view all interactions on their items
CREATE POLICY "Users can view interactions" ON user_interactions
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM robots WHERE robots.id = user_interactions.target_id AND robots.seller_id = auth.uid() AND user_interactions.target_type = 'robots'
  )
  OR EXISTS (
    SELECT 1 FROM spare_parts WHERE spare_parts.id = user_interactions.target_id AND spare_parts.seller_id = auth.uid() AND user_interactions.target_type = 'spare_parts'
  )
  OR EXISTS (
    SELECT 1 FROM services WHERE services.id = user_interactions.target_id AND services.provider_id = auth.uid() AND user_interactions.target_type = 'services'
  )
  OR EXISTS (
    SELECT 1 FROM logistics_services WHERE logistics_services.id = user_interactions.target_id AND logistics_services.provider_id = auth.uid() AND user_interactions.target_type = 'logistics_services'
  )
  OR EXISTS (
    SELECT 1 FROM loan_products WHERE loan_products.id = user_interactions.target_id AND loan_products.provider_id = auth.uid() AND user_interactions.target_type = 'loan_products'
  )
);

-- Also allow anonymous users to insert view tracking
DROP POLICY IF EXISTS "Users can create their own interactions" ON user_interactions;

CREATE POLICY "Anyone can create view interactions" ON user_interactions
FOR INSERT WITH CHECK (true);

-- Allow anyone to view interactions (for public view counts display)
CREATE POLICY "Anyone can view interaction counts" ON user_interactions
FOR SELECT USING (true);