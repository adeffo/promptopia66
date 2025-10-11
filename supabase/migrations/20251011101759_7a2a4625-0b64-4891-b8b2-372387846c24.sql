-- Add social media columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN instagram_url text,
ADD COLUMN facebook_url text;

-- Add constraints to validate URLs
ALTER TABLE public.profiles
ADD CONSTRAINT instagram_url_format CHECK (instagram_url IS NULL OR instagram_url ~* '^https?://'),
ADD CONSTRAINT facebook_url_format CHECK (facebook_url IS NULL OR facebook_url ~* '^https?://');