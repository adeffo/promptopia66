-- Add ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, prompt_id)
);

-- Add average_rating column to prompts
ALTER TABLE public.prompts
ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN ratings_count INTEGER DEFAULT 0;

-- Enable RLS for ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ratings
CREATE POLICY "Ratings are viewable by everyone"
ON public.ratings FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create ratings"
ON public.ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.ratings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.ratings FOR DELETE
USING (auth.uid() = user_id);

-- Function to update average rating
CREATE OR REPLACE FUNCTION public.update_prompt_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  total_ratings INTEGER;
BEGIN
  -- Calculate average rating and count
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, total_ratings
  FROM public.ratings
  WHERE prompt_id = COALESCE(NEW.prompt_id, OLD.prompt_id);
  
  -- Update prompts table
  UPDATE public.prompts
  SET 
    average_rating = avg_rating,
    ratings_count = total_ratings
  WHERE id = COALESCE(NEW.prompt_id, OLD.prompt_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers for rating changes
CREATE TRIGGER on_rating_insert
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_prompt_rating();

CREATE TRIGGER on_rating_update
AFTER UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_prompt_rating();

CREATE TRIGGER on_rating_delete
AFTER DELETE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_prompt_rating();

-- Trigger for updated_at
CREATE TRIGGER update_ratings_updated_at
BEFORE UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();