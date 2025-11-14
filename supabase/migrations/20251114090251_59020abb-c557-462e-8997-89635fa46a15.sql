-- Enable real-time updates for chat_messages table
-- This ensures both sender and receiver see messages instantly

-- Set replica identity to FULL to capture all column changes
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add the table to the realtime publication if not already added
DO $$
BEGIN
  -- Check if the table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'chat_messages'
  ) THEN
    -- Add the table to the realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;