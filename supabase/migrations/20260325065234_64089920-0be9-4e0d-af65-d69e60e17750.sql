-- Allow all authenticated users to view user_product_requests (contact info is masked in the UI until unlocked)
CREATE POLICY "Authenticated users can view requests"
  ON public.user_product_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert request_assignments (to unlock requests)
CREATE POLICY "Authenticated users can insert assignments"
  ON public.request_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());