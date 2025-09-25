-- Add edit functionality columns to community_posts if they don't exist
DO $$ 
BEGIN
    -- Add edit timestamp column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_posts' AND column_name = 'edited_at'
    ) THEN
        ALTER TABLE public.community_posts ADD COLUMN edited_at timestamp with time zone;
    END IF;
    
    -- Add edit history column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_posts' AND column_name = 'edit_history'
    ) THEN
        ALTER TABLE public.community_posts ADD COLUMN edit_history jsonb DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add video thumbnail column for better video handling
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_posts' AND column_name = 'video_thumbnail'
    ) THEN
        ALTER TABLE public.community_posts ADD COLUMN video_thumbnail text;
    END IF;
END $$;