CREATE POLICY "Buyers can update quotation status for negotiation"
ON public.crm_quotations
FOR UPDATE
TO authenticated
USING (
  buyer_email = (
    SELECT profiles.email
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  buyer_email = (
    SELECT profiles.email
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    LIMIT 1
  )
);