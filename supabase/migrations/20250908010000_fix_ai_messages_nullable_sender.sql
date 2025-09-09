-- Fix messages table to allow AI messages (sender_id = null)

-- Drop the existing foreign key constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Make sender_id nullable for AI messages
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;

-- Recreate the foreign key constraint but allow null values
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the RLS policy to handle AI messages properly
DROP POLICY IF EXISTS "Users can send messages to their sessions" ON public.messages;

CREATE POLICY "Users can send messages to their sessions"
ON public.messages
FOR INSERT
WITH CHECK (
  (sender_id = auth.uid() OR sender_id IS NULL)
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = session_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- Also update the SELECT policy to allow viewing AI messages
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.messages;

CREATE POLICY "Users can view messages in their sessions"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = session_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);
