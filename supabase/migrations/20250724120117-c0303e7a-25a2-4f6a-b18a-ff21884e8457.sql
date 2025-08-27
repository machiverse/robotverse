-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('robot-images', 'robot-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for robot images (public)
CREATE POLICY "Robot images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'robot-images');

CREATE POLICY "Authenticated users can upload robot images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'robot-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own robot images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'robot-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own robot images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'robot-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for documents (private)
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);