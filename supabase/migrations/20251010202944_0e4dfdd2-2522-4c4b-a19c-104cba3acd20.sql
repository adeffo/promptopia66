-- Create storage bucket for prompt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('prompt-images', 'prompt-images', true);

-- Storage policies for prompt images
CREATE POLICY "Prompt images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'prompt-images');

CREATE POLICY "Authenticated users can upload prompt images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'prompt-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own prompt images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'prompt-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own prompt images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'prompt-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);