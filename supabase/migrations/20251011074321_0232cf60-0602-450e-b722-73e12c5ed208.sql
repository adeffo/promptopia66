-- Enable realtime on notifications table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END$$;

-- Allow inserting comment notifications for the prompt owner
-- This enables the client (comment author) to create a notification row whose user_id is the prompt creator.
CREATE POLICY "Users can insert comment notifications for prompt owners"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'comment'
  AND payload ? 'prompt_id'
  AND EXISTS (
    SELECT 1
    FROM public.prompts p
    WHERE p.id = (payload->>'prompt_id')::uuid
      AND p.creator_id = user_id
  )
);
