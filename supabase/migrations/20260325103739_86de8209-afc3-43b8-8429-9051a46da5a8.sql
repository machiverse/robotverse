-- Allow admins to view all user_requests (quote requests)
CREATE POLICY "Admins can view all user requests"
ON public.user_requests
FOR SELECT
USING (is_admin());
