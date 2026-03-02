-- Allow admins to view all seller credits
CREATE POLICY "Admins can view all seller credits"
ON public.seller_credits
FOR SELECT
USING (is_admin());

-- Allow admins to update any seller credits
CREATE POLICY "Admins can update any seller credits"
ON public.seller_credits
FOR UPDATE
USING (is_admin());

-- Allow admins to insert seller credits for any user
CREATE POLICY "Admins can insert seller credits"
ON public.seller_credits
FOR INSERT
WITH CHECK (is_admin());