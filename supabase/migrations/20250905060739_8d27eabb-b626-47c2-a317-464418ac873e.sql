-- Update RLS policy for user_interactions to allow sellers to view interactions on their items
DROP POLICY IF EXISTS "Users can view their own interactions" ON user_interactions;
DROP POLICY IF EXISTS "Sellers can view interactions on their items" ON user_interactions;

-- Allow users to view their own interactions AND sellers to view interactions on their items
CREATE POLICY "Users can view interactions" ON user_interactions
FOR SELECT USING (
  -- Users can see their own interactions
  auth.uid() = user_id 
  OR 
  -- Sellers can see interactions on their robots
  (target_type = 'robots' AND target_id IN (
    SELECT id FROM robots WHERE seller_id = auth.uid()
  ))
  OR 
  -- Sellers can see interactions on their spare parts
  (target_type = 'spare_parts' AND target_id IN (
    SELECT id FROM spare_parts WHERE seller_id = auth.uid()
  ))
  OR 
  -- Service providers can see interactions on their services
  (target_type = 'services' AND target_id IN (
    SELECT id FROM services WHERE provider_id = auth.uid()
  ))
  OR 
  -- Logistics providers can see interactions on their logistics services
  (target_type = 'logistics_services' AND target_id IN (
    SELECT id FROM logistics_services WHERE provider_id = auth.uid()
  ))
  OR 
  -- Finance providers can see interactions on their loan products
  (target_type = 'loan_products' AND target_id IN (
    SELECT id FROM loan_products WHERE provider_id = auth.uid()
  ))
);