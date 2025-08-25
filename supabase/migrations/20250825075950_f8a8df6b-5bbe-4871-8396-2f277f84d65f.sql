-- Create robot_custom_fields table
CREATE TABLE public.robot_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_id UUID NOT NULL REFERENCES public.robots(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.robot_custom_fields ENABLE ROW LEVEL SECURITY;

-- Create policies for robot_custom_fields
CREATE POLICY "Anyone can view custom fields"
  ON public.robot_custom_fields 
  FOR SELECT 
  USING (true);

CREATE POLICY "Robot owners can manage custom fields"
  ON public.robot_custom_fields 
  FOR ALL 
  USING (
    robot_id IN (
      SELECT id FROM public.robots WHERE seller_id = auth.uid()
    )
  );

-- Add brochure and video columns to robots table
ALTER TABLE public.robots 
ADD COLUMN brochure_url TEXT,
ADD COLUMN video_url TEXT,
ADD COLUMN video_type TEXT DEFAULT 'upload'; -- 'upload' or 'youtube'

-- Create storage bucket for robot documents (PDFs and videos)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('robot-documents', 'robot-documents', true);

-- Create storage policies for robot documents
CREATE POLICY "Anyone can view robot documents"
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'robot-documents');

CREATE POLICY "Robot owners can upload documents"
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'robot-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Robot owners can update their documents"
  ON storage.objects 
  FOR UPDATE 
  USING (
    bucket_id = 'robot-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Robot owners can delete their documents"
  ON storage.objects 
  FOR DELETE 
  USING (
    bucket_id = 'robot-documents' AND
    auth.uid() IS NOT NULL
  );

-- Create trigger for updating timestamps
CREATE TRIGGER update_robot_custom_fields_updated_at
  BEFORE UPDATE ON public.robot_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();