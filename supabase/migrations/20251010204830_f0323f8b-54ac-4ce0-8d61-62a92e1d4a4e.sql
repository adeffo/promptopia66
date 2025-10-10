-- Fix favorites table RLS policy to restrict access to user's own favorites
-- Remove the public SELECT policy
DROP POLICY IF EXISTS "Favorites are viewable by everyone" ON public.favorites;

-- Create a restricted policy for authenticated users to view only their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);