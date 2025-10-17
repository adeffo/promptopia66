-- Drop the likes system (which was the old favorites)
DROP TRIGGER IF EXISTS update_likes_count_trigger ON likes;
DROP FUNCTION IF EXISTS update_likes_count();
DROP TABLE IF EXISTS likes;

-- Remove likes_count column from prompts
ALTER TABLE prompts DROP COLUMN IF EXISTS likes_count;

-- The current favorites table is what we want to keep
-- It already has the correct structure and policies