-- Fix user_roles table exposure
DROP POLICY IF EXISTS "User roles are viewable by everyone" ON public.user_roles;

CREATE POLICY "Authenticated users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Add database constraints for input validation
-- Drop constraints if they exist, then add them
DO $$ 
BEGIN
  ALTER TABLE public.prompts DROP CONSTRAINT IF EXISTS title_length;
  ALTER TABLE public.prompts DROP CONSTRAINT IF EXISTS prompt_text_length;
  ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS text_length;
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS display_name_length;
END $$;

ALTER TABLE public.prompts 
  ADD CONSTRAINT title_length CHECK (length(title) <= 100),
  ADD CONSTRAINT prompt_text_length CHECK (length(prompt_text) <= 5000);

ALTER TABLE public.comments
  ADD CONSTRAINT text_length CHECK (length(text) <= 1000);

ALTER TABLE public.profiles
  ADD CONSTRAINT display_name_length CHECK (length(display_name) <= 50);