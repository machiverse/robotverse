-- Fix the foreign key relationship between blogs and profiles tables
-- First, check if profiles table exists and has the correct structure
ALTER TABLE public.blogs 
DROP CONSTRAINT IF EXISTS blogs_author_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE public.blogs 
ADD CONSTRAINT blogs_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON public.blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON public.blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON public.blogs(published_at);