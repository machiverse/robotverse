-- Allow buyers to read quotations sent to their email
CREATE POLICY "Buyers can view quotations sent to them"
ON public.crm_quotations
FOR SELECT
USING (
  buyer_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);