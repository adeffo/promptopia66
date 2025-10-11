-- Update RLS policy for ratings to be more explicit for authenticated users
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON public.ratings;

CREATE POLICY "Authenticated users can create ratings"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);