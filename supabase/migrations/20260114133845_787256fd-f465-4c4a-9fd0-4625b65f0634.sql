-- Create unlocked_contacts table to track which contacts users have paid to unlock
CREATE TABLE public.unlocked_contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL,
    credits_used INTEGER NOT NULL DEFAULT 5,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_unlock UNIQUE (user_id, seller_id, item_id, item_type)
);

-- Enable Row Level Security
ALTER TABLE public.unlocked_contacts ENABLE ROW LEVEL SECURITY;

-- Users can view their own unlocked contacts
CREATE POLICY "Users can view their own unlocked contacts" 
ON public.unlocked_contacts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own unlock records
CREATE POLICY "Users can unlock contacts" 
ON public.unlocked_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_unlocked_contacts_user ON public.unlocked_contacts(user_id);
CREATE INDEX idx_unlocked_contacts_lookup ON public.unlocked_contacts(user_id, seller_id, item_id, item_type);