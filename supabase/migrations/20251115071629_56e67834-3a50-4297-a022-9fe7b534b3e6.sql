-- Create notifications table for different types of notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'message', 'robot_view', 'service_view', 'part_view'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT, -- ID of the related item (robot_id, conversation_id, etc.)
  reference_type TEXT, -- 'robot', 'service', 'spare_part', 'conversation'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to track robot views and create notifications
CREATE OR REPLACE FUNCTION public.track_robot_view_notification()
RETURNS TRIGGER AS $$
DECLARE
  robot_record RECORD;
  seller_id UUID;
BEGIN
  -- Get robot details and seller
  SELECT r.name, r.seller_id INTO robot_record
  FROM public.robots r
  WHERE r.id = NEW.item_id AND NEW.item_type = 'robot';
  
  -- Only create notification if we found the robot and viewer is not the seller
  IF FOUND AND NEW.user_id IS NOT NULL AND NEW.user_id != robot_record.seller_id THEN
    -- Create notification for seller
    INSERT INTO public.notifications (
      user_id,
      notification_type,
      title,
      message,
      reference_id,
      reference_type
    ) VALUES (
      robot_record.seller_id,
      'robot_view',
      'New Robot View',
      'Someone viewed your robot: ' || robot_record.name,
      NEW.item_id,
      'robot'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for robot view notifications
CREATE TRIGGER trigger_robot_view_notification
  AFTER INSERT ON public.item_view_counts
  FOR EACH ROW
  EXECUTE FUNCTION public.track_robot_view_notification();