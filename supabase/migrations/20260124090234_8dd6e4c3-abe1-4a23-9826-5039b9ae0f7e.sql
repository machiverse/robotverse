-- Drop the existing check constraint
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT credit_transactions_transaction_type_check;

-- Add updated check constraint with quote_unlock and contact_unlock types
ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['purchase', 'subscription_credit', 'lead_unlock', 'quote_unlock', 'contact_unlock', 'refund', 'bonus', 'expired']));