-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can create their own interactions" ON public.button_interactions;

-- Create a new policy that allows both authenticated and anonymous users to insert
CREATE POLICY "Anyone can create interactions" 
ON public.button_interactions 
FOR INSERT 
WITH CHECK (true);