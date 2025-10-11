-- Add visibility column to prompts table
ALTER TABLE public.prompts 
ADD COLUMN visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

-- Create index for better query performance
CREATE INDEX idx_prompts_visibility ON public.prompts(visibility);

-- Update RLS policy for prompts to allow users to see their own private prompts
DROP POLICY IF EXISTS "Prompts are viewable by everyone" ON public.prompts;

CREATE POLICY "Public prompts are viewable by everyone" 
ON public.prompts 
FOR SELECT 
USING (visibility = 'public' OR auth.uid() = creator_id);