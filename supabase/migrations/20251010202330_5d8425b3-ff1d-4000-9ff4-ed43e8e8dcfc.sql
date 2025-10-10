-- Fix security warnings: Add search_path to all functions

-- Update function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update function to increment favorites_count
CREATE OR REPLACE FUNCTION public.increment_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prompts
  SET favorites_count = favorites_count + 1
  WHERE id = NEW.prompt_id;
  RETURN NEW;
END;
$$;

-- Update function to decrement favorites_count
CREATE OR REPLACE FUNCTION public.decrement_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prompts
  SET favorites_count = favorites_count - 1
  WHERE id = OLD.prompt_id;
  RETURN OLD;
END;
$$;

-- Update function to increment comments_count
CREATE OR REPLACE FUNCTION public.increment_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prompts
  SET comments_count = comments_count + 1
  WHERE id = NEW.prompt_id;
  RETURN NEW;
END;
$$;

-- Update function to decrement comments_count
CREATE OR REPLACE FUNCTION public.decrement_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prompts
  SET comments_count = comments_count - 1
  WHERE id = OLD.prompt_id;
  RETURN OLD;
END;
$$;