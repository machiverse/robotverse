-- Add policy for sellers to view button interactions on their products
CREATE POLICY "Sellers can view interactions on their products" 
ON public.button_interactions 
FOR SELECT 
USING (auth.uid() = seller_id);