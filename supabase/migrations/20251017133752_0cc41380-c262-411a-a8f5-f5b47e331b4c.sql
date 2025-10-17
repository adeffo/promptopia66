-- Add gender column to profiles table
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'diverse', 'prefer_not_to_say');

ALTER TABLE public.profiles
ADD COLUMN gender public.gender_type,
ADD COLUMN photo_url_1 text,
ADD COLUMN photo_url_2 text,
ADD COLUMN photo_url_3 text;

-- Create a private storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-photos bucket
CREATE POLICY "Users can view their own photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);